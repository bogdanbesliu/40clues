import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // 1. Extragem toate scorurile utilizatorului
    const { data: scores, error: scoresError } = await supabase
      .from("user_scores")
      .select("game_date, score, clues_used, created_at")
      .eq("user_id", user.id)
      .order("game_date", { ascending: false });

    if (scoresError) {
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    // 2. Extragem titlurile filmelor pentru istoric
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

    // 3. Calcul Statistici Carieră
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

    const distribution = {
      psychic: 0,
      buff: 0,
      casual: 0,
      detective: 0,
      skinOfTeeth: 0,
    };

    let perfectScoresCount = 0; // scoruri de 1000 pct
    let clutchWinsCount = 0; // ghicit la ultimul indiciu (40)
    let underFiveCluesCount = 0; // ghicite în sub 5 indicii

    (scores || []).forEach((s) => {
      const c = s.clues_used;
      if (c <= 3) distribution.psychic++;
      else if (c <= 10) distribution.buff++;
      else if (c <= 25) distribution.casual++;
      else if (c <= 39) distribution.detective++;
      else if (c === 40) distribution.skinOfTeeth++;

      if (s.score === 1000) perfectScoresCount++;
      if (c === 40) clutchWinsCount++;
      if (c <= 5) underFiveCluesCount++;
    });

    // 4. Calcul Streak curent și Max Streak
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

    // 5. Istoric meciuri
    const history = (scores || []).map((s) => ({
      gameDate: s.game_date,
      score: s.score,
      cluesUsed: s.clues_used,
      movieTitle: gamesMap[s.game_date]?.title || "Cinema Mystery",
      movieYear: gamesMap[s.game_date]?.year || "",
    }));

    // 6. Suita completă de 15 Badges cu Progres (current / target)
    const badges = [
      {
        id: "first_win",
        title: "First Blood",
        desc: "Solve your very first movie puzzle",
        icon: "🎬",
        current: Math.min(1, totalPlayed),
        target: 1,
        unlocked: totalPlayed >= 1,
      },
      {
        id: "streak_3",
        title: "Hat-Trick",
        desc: "Achieve a 3-day daily streak",
        icon: "🎩",
        current: Math.min(3, maxStreak),
        target: 3,
        unlocked: maxStreak >= 3,
      },
      {
        id: "streak_7",
        title: "Week Warrior",
        desc: "Reach a 7-day win streak",
        icon: "🔥",
        current: Math.min(7, maxStreak),
        target: 7,
        unlocked: maxStreak >= 7,
      },
      {
        id: "streak_14",
        title: "Fortnight Fanatic",
        desc: "Reach a 14-day daily streak",
        icon: "⚡",
        current: Math.min(14, maxStreak),
        target: 14,
        unlocked: maxStreak >= 14,
      },
      {
        id: "streak_30",
        title: "Monthly Master",
        desc: "Conquer a 30-day streak without missing",
        icon: "👑",
        current: Math.min(30, maxStreak),
        target: 30,
        unlocked: maxStreak >= 30,
      },
      {
        id: "psychic_strike",
        title: "Cinephile Psychic",
        desc: "Deduce a film in 3 clues or fewer",
        icon: "🎯",
        current: Math.min(1, distribution.psychic),
        target: 1,
        unlocked: distribution.psychic >= 1,
      },
      {
        id: "sharp_intuition",
        title: "Sharp Intuition",
        desc: "Solve 5 different movies in under 5 clues",
        icon: "👁️",
        current: Math.min(5, underFiveCluesCount),
        target: 5,
        unlocked: underFiveCluesCount >= 5,
      },
      {
        id: "perfectionist",
        title: "Perfectionist",
        desc: "Score a maximum 1,000 pts on a puzzle",
        icon: "✨",
        current: Math.min(1, perfectScoresCount),
        target: 1,
        unlocked: perfectScoresCount >= 1,
      },
      {
        id: "skin_of_teeth",
        title: "Clutch Detective",
        desc: "Solve a puzzle on the 40th and final clue",
        icon: "🪢",
        current: Math.min(1, clutchWinsCount),
        target: 1,
        unlocked: clutchWinsCount >= 1,
      },
      {
        id: "silver_screen",
        title: "Silver Screen Veteran",
        desc: "Successfully solve 10 movie puzzles",
        icon: "🎞️",
        current: Math.min(10, totalPlayed),
        target: 10,
        unlocked: totalPlayed >= 10,
      },
      {
        id: "director_cut",
        title: "Director's Cut",
        desc: "Successfully solve 25 movie puzzles",
        icon: "📽️",
        current: Math.min(25, totalPlayed),
        target: 25,
        unlocked: totalPlayed >= 25,
      },
      {
        id: "century_club",
        title: "Century Club",
        desc: "Play and solve 100 cinema puzzles",
        icon: "🏆",
        current: Math.min(100, totalPlayed),
        target: 100,
        unlocked: totalPlayed >= 100,
      },
      {
        id: "point_collector",
        title: "High Roller",
        desc: "Accumulate 5,000 total career points",
        icon: "🪙",
        current: Math.min(5000, totalPoints),
        target: 5000,
        unlocked: totalPoints >= 5000,
      },
      {
        id: "score_titan",
        title: "Score Titan",
        desc: "Accumulate 20,000 total career points",
        icon: "💎",
        current: Math.min(20000, totalPoints),
        target: 20000,
        unlocked: totalPoints >= 20000,
      },
      {
        id: "hall_of_fame",
        title: "Cinephile Legend",
        desc: "Reach a 50-day daily streak",
        icon: "🌟",
        current: Math.min(50, maxStreak),
        target: 50,
        unlocked: maxStreak >= 50,
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