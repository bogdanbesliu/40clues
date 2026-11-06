import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isNameForbidden } from "@/lib/nameModeration";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const cookieStore = await cookies();
    const supabase = token
      ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      )
      : createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch (err) {
                console.error("Score route cookie set error:", err);
              }
            },
          },
        }
      );

    const {
      data: { user },
    } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    // Use service role admin client for database writes if available to ensure server-side resilience
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : supabase;

    const { gameDate, cluesUsed, score, anonName } = await request.json();

    if (!gameDate || typeof cluesUsed !== "number" || typeof score !== "number") {
      return NextResponse.json({ error: "Missing score fields" }, { status: 400 });
    }

    if (!DATE_REGEX.test(gameDate)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Server-side bounds enforcement
    if (cluesUsed < 1 || cluesUsed > 40 || !Number.isInteger(cluesUsed)) {
      return NextResponse.json({ error: "Invalid cluesUsed value (must be 1-40)" }, { status: 400 });
    }

    if (score < 0 || score > 1000 || !Number.isInteger(score)) {
      return NextResponse.json({ error: "Invalid score value (must be 0-1000)" }, { status: 400 });
    }

    // CASE 1: Authenticated user
    if (user) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      let validatedAnonName: string | null = null;
      if (
        anonName &&
        typeof anonName === "string" &&
        !anonName.startsWith("BingeWatcher_") &&
        !anonName.startsWith("Cinephile_")
      ) {
        const candidate = anonName.trim().slice(0, 25);
        if (candidate.length >= 2) {
          const check = await isNameForbidden(candidate);
          if (!check.isForbidden) {
            validatedAnonName = candidate;
          }
        }
      }

      const displayName =
        existingProfile?.display_name ||
        validatedAnonName ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "TV Detective";
      const avatarUrl = existingProfile?.avatar_url || user.user_metadata?.avatar_url || null;

      await db.from("profiles").upsert(
        {
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

      const { error: scoreError } = await db.from("daily_scores_tv").upsert(
        {
          user_id: user.id,
          game_date: gameDate,
          clues_used: cluesUsed,
          score: score,
          anon_name: displayName,
        },
        { onConflict: "user_id,game_date" }
      );

      if (scoreError) {
        console.error("TV Score submission error (auth):", scoreError.message);
        return NextResponse.json({ error: "Failed to record TV score" }, { status: 400 });
      }

      // Recalculate TV total statistics for Global TV Leaderboard
      const { data: allScores } = await db
        .from("daily_scores_tv")
        .select("score, game_date")
        .eq("user_id", user.id)
        .order("game_date", { ascending: true });

      const rows = allScores || [];
      const totalScoreTv = rows.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const gamesPlayedTv = rows.length;

      let currentStreakTv = 0;
      let maxStreakTv = 0;
      let prevDate: Date | null = null;

      for (const r of rows) {
        const d = new Date(`${r.game_date}T00:00:00Z`);
        if (!prevDate) {
          currentStreakTv = 1;
        } else {
          const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreakTv += 1;
          } else if (diffDays > 1) {
            currentStreakTv = 1;
          }
        }
        if (currentStreakTv > maxStreakTv) maxStreakTv = currentStreakTv;
        prevDate = d;
      }

      // Safely attempt updating profiles with TV stats (does not fail score save if schema migration pending)
      const { error: profileUpdateErr } = await db
        .from("profiles")
        .update({
          total_score_tv: totalScoreTv,
          games_played_tv: gamesPlayedTv,
          current_streak_tv: currentStreakTv,
          max_streak_tv: maxStreakTv,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileUpdateErr) {
        console.warn("TV Profile stats update notice (run tv_series_schema.sql if columns missing):", profileUpdateErr.message);
      }

      return NextResponse.json({
        success: true,
        totalScore: totalScoreTv,
        gamesPlayed: gamesPlayedTv,
        currentStreak: currentStreakTv,
        maxStreak: maxStreakTv,
      });
    }

    // CASE 2: Unauthenticated user (Guest) -> Rate limit & record
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = db;

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await adminClient
        .from("daily_scores_tv")
        .select("*", { count: "exact", head: true })
        .is("user_id", null)
        .eq("game_date", gameDate)
        .gte("created_at", tenMinutesAgo);

      if (count !== null && count >= 10) {
        return NextResponse.json(
          { error: "Too many guest score submissions. Please try again later or sign in." },
          { status: 429 }
        );
      }
    }

    const trimmedAnon = typeof anonName === "string" ? anonName.trim().slice(0, 25) : "";
    let finalUsername = trimmedAnon;

    if (finalUsername) {
      const check = await isNameForbidden(finalUsername);
      if (check.isForbidden) {
        finalUsername = `BingeWatcher_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      finalUsername = `BingeWatcher_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const { error: guestError } = await db.from("daily_scores_tv").insert({
      user_id: null,
      game_date: gameDate,
      clues_used: cluesUsed,
      score: score,
      anon_name: finalUsername,
    });

    if (guestError) {
      console.error("TV Score submission error (guest):", guestError.message);
      return NextResponse.json({ error: "Failed to record score" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      guest: true,
      anonName: finalUsername,
    });
  } catch (err: unknown) {
    console.error("TV Score POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
