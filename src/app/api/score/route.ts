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
      error: authError,
    } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gameDate, cluesUsed, score } = await request.json();

    if (!gameDate || typeof cluesUsed !== "number" || typeof score !== "number") {
      return NextResponse.json({ error: "Missing score fields" }, { status: 400 });
    }

    // 1. Ne asigurăm că utilizatorul are un rând în `profiles` înainte de a insera în `daily_scores`
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Detective";
    const avatarUrl = user.user_metadata?.avatar_url || null;

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" }
    );

    // 2. Salvăm scorul zilei în `daily_scores`
    const { error: scoreError } = await supabase.from("daily_scores").upsert(
      {
        user_id: user.id,
        game_date: gameDate,
        clues_used: cluesUsed,
        score: score,
      },
      { onConflict: "user_id,game_date" }
    );

    if (scoreError) {
      console.error("Daily score upsert error:", scoreError);
      return NextResponse.json({ error: scoreError.message }, { status: 400 });
    }

    // 3. Recalculăm statisticile totale și streak-urile din toate jocurile utilizatorului
    const { data: allScores } = await supabase
      .from("daily_scores")
      .select("score, game_date")
      .eq("user_id", user.id)
      .order("game_date", { ascending: true });

    const rows = allScores || [];
    const totalScore = rows.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const gamesPlayed = rows.length;

    // Calculăm currentStreak și maxStreak pe baza datelor consecutive
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
  } catch (err: any) {
    console.error("Score route exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}