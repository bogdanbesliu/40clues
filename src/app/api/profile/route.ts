import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    // Folosim clientul standard cu cheia anonimă și injectăm direct token-ul utilizatorului
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 1. Verificăm autenticitatea utilizatorului prin token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // 2. Extragem scorurile utilizatorului curent
    const { data: scores, error: scoresError } = await supabase
      .from("user_scores")
      .select("game_date, score, clues_used, created_at")
      .eq("user_id", user.id)
      .order("game_date", { ascending: false });

    if (scoresError) {
      console.error("Supabase scores fetch error:", scoresError);
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    // 3. Extragem detaliile filmelor jucate pentru istoricul vizual
    const gameDates = (scores || []).map((s) => s.game_date);
    const gamesMap: Record<string, { title: string; year: number }> = {};

    if (gameDates.length > 0) {
      const { data: games } = await supabase
        .from("daily_games")
        .select("game_date, title, year")
        .in("game_date", gameDates);

      (games || []).forEach((g) => {
        gamesMap[g.game_date] = { title: g.title, year: g.year };
      });
    }

    // 4. Calcul Statistici Carieră
    const totalPlayed = scores?.length || 0;
    const totalPoints = (scores || []).reduce((acc, curr) => acc + (curr.score || 0), 0);
    const avgClues =
      totalPlayed > 0
        ? parseFloat(
            (
              (scores || []).reduce((acc, curr) => acc + (curr.clues_used || 0), 0) /
              totalPlayed
            ).toFixed(1)
          )
        : 0;

    // 5. Distribuția ghicirilor conform Game Design
    const distribution = {
      psychic: 0, // 1-3 indicii
      buff: 0, // 4-10 indicii
      casual: 0, // 11-25 indicii
      detective: 0, // 26-39 indicii
      skinOfTeeth: 0, // 40 indicii
    };

    (scores || []).forEach((s) => {
      const c = s.clues_used;
      if (c <= 3) distribution.psychic++;
      else if (c <= 10) distribution.buff++;
      else if (c <= 25) distribution.casual++;
      else if (c <= 39) distribution.detective++;
      else if (c === 40) distribution.skinOfTeeth++;
    });

    // 6. Calcul Streak curent și Streak maxim
    const sortedDates = (scores || [])
      .map((s) => s.game_date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const d1 = new Date(sortedDates[i]);
          const d2 = new Date(sortedDates[i + 1]);
          const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) currentStreak++;
          else break;
        }
      }

      tempStreak = 1;
      maxStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const d1 = new Date(sortedDates[i]);
        const d2 = new Date(sortedDates[i + 1]);
        const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
    }

    // 7. Istoric
    const history = (scores || []).map((s) => ({
      gameDate: s.game_date,
      score: s.score,
      cluesUsed: s.clues_used,
      movieTitle: gamesMap[s.game_date]?.title || "Cinema Mystery",
      movieYear: gamesMap[s.game_date]?.year || "",
    }));

    // 8. Badges deblocate
    const badges = [
      {
        id: "first_win",
        title: "First Blood",
        desc: "Solve your very first movie puzzle",
        icon: "🎬",
        unlocked: totalPlayed >= 1,
      },
      {
        id: "psychic_strike",
        title: "Cinephile Psychic",
        desc: "Deduce a movie in 3 clues or fewer",
        icon: "🎯",
        unlocked: distribution.psychic >= 1,
      },
      {
        id: "week_warrior",
        title: "Week Warrior",
        desc: "Reach a 7-day win streak",
        icon: "🔥",
        unlocked: maxStreak >= 7,
      },
      {
        id: "century_club",
        title: "Century Club",
        desc: "Play 100 cinema puzzles",
        icon: "🏆",
        unlocked: totalPlayed >= 100,
      },
      {
        id: "perfectionist",
        title: "Perfectionist",
        desc: "Score a maximum 1,000 points on a puzzle",
        icon: "✨",
        unlocked: (scores || []).some((s) => s.score === 1000),
      },
    ];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Detective",
        avatar: user.user_metadata?.avatar_url || null,
      },
      stats: {
        totalPlayed,
        totalPoints,
        avgClues,
        currentStreak,
        maxStreak,
        distribution,
      },
      badges,
      history,
    });
  } catch (err: any) {
    console.error("API Profile crash:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}