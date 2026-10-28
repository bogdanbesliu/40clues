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

    // CASE 1: Authenticated user (signed in with Google)
    if (user) {
      // Check if user has an existing custom display_name in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const displayName =
        existingProfile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Detective";
      const avatarUrl = existingProfile?.avatar_url || user.user_metadata?.avatar_url || null;

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

      const { error: scoreError } = await supabase.from("daily_scores").upsert(
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
        console.error("Score submission error (auth):", scoreError.message);
        return NextResponse.json({ error: "Failed to record score" }, { status: 400 });
      }

      // Recalculate total statistics for Global Leaderboard and Profile
      const { data: allScores } = await supabase
        .from("daily_scores")
        .select("score, game_date")
        .eq("user_id", user.id)
        .order("game_date", { ascending: true });

      const rows = allScores || [];
      const totalScore = rows.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const gamesPlayed = rows.length;

      let currentStreak = 0;
      let maxStreak = 0;
      let prevDate: Date | null = null;

      for (const r of rows) {
        const d = new Date(`${r.game_date}T00:00:00Z`);
        if (!prevDate) {
          currentStreak = 1;
        } else {
          const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak += 1;
          } else if (diffDays > 1) {
            currentStreak = 1;
          }
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        prevDate = d;
      }

      await supabase
        .from("profiles")
        .update({
          total_score: totalScore,
          games_played: gamesPlayed,
          current_streak: currentStreak,
          max_streak: maxStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({
        success: true,
        totalScore,
        gamesPlayed,
        currentStreak,
        maxStreak,
      });
    }

    // CASE 2: Unauthenticated user (Guest) -> Rate limit / Dedup submissions
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip";

    // Rate limit: max 5 guest submissions per 10 minutes from same IP
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await adminClient
        .from("daily_scores")
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
        // Fall back to clean anonymous name if restricted language was bypassed
        finalUsername = `Cinephile_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      finalUsername = `Cinephile_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const { error: guestError } = await supabase.from("daily_scores").insert({
      user_id: null,
      game_date: gameDate,
      clues_used: cluesUsed,
      score: score,
      anon_name: finalUsername,
    });

    if (guestError) {
      console.error("Score submission error (guest):", guestError.message);
      return NextResponse.json({ error: "Failed to record score" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      guest: true,
      anonName: finalUsername,
    });
  } catch (err: any) {
    console.error("Score POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
