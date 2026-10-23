import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
            } catch {
              // Read-only environment handling
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extragem toate scorurile utilizatorului
    const { data: scores, error: scoresError } = await supabase
      .from("user_scores")
      .select("game_date, score, clues_used, created_at")
      .eq("user_id", user.id)
      .order("game_date", { ascending: false });

    if (scoresError) {
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    // Extragem detaliile filmelor jucate pentru a le afișa în istoric
    const gameDates = (scores || []).map((s) => s.game_date);
    let gamesMap: Record<string, { title: string; year: number }> = {};

    if (gameDates.length > 0) {
      const { data: games } = await supabase
        .from("daily_games")
        .select("game_date, title, year")
        .in("game_date", gameDates);

      (games || []).forEach((g) => {
        gamesMap[g.game_date] = { title: g.title, year: g.year };
      });
    }

    // 1. Calcul Statistici Carieră
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

    // 2. Distribuția ghicirilor conform badge-urilor din Game Design
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

    // 3. Calcul Streak curent și Streak maxim
    const sortedDates = (scores || [])
      .map((s) => s.game_date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Verificăm dacă streak-ul este activ astăzi sau ieri
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const d1 = new Date(sortedDates[i]);
          const d2 = new Date(sortedDates[i + 1]);
          const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Max Streak istoric
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

    // 4. Istoric formatat
    const history = (scores || []).map((s) => ({
      gameDate: s.game_date,
      score: s.score,
      cluesUsed: s.clues_used,
      movieTitle: gamesMap[s.game_date]?.title || "Unknown Film",
      movieYear: gamesMap[s.game_date]?.year || "",
    }));

    // 5. Calcul Insigne / Milestones deblocate
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
    return NextResponse.json(
      { error: "Failed to fetch profile", details: err?.message },
      { status: 500 }
    );
  }
}