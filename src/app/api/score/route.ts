import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
              } catch { }
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
        return NextResponse.json({ error: scoreError.message }, { status: 400 });
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

    // CASE 2: Unauthenticated user (Guest) -> save to Daily Leaderboard with custom or generated username
    const trimmedAnon = typeof anonName === "string" ? anonName.trim().slice(0, 25) : "";
    const generatedUsername =
      trimmedAnon || `Cinephile_${Math.floor(1000 + Math.random() * 9000)}`;

    const { error: guestError } = await supabase.from("daily_scores").insert({
      user_id: null,
      game_date: gameDate,
      clues_used: cluesUsed,
      score: score,
      anon_name: generatedUsername,
    });

    if (guestError) {
      return NextResponse.json({ error: guestError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      guest: true,
      anonName: generatedUsername,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}