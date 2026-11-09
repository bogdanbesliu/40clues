import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isNameForbidden } from "@/lib/nameModeration";
import { getClueBadge } from "@/lib/clueCategories";

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

    // 1. Fetch all user scores from daily_scores_tv
    const { data: scores, error: scoresError } = await supabase
      .from("daily_scores_tv")
      .select("game_date, score, clues_used, created_at")
      .eq("user_id", user.id)
      .order("game_date", { ascending: false });

    if (scoresError) {
      console.error("TV Profile GET scores query error:", scoresError.message);
      return NextResponse.json({ error: "Failed to fetch user TV scores" }, { status: 500 });
    }

    // 2. Fetch TV show titles & seasons for history & badge computation
    const gameDates = (scores || []).map((s) => s.game_date);
    const gamesMap: Record<string, { title: string; year: number; seasons?: number; clues?: string[] }> = {};

    if (gameDates.length > 0) {
      const { data: games } = await supabase
        .from("daily_games_tv")
        .select("game_date, title, year, seasons, clues")
        .in("game_date", gameDates);

      (games || []).forEach((g) => {
        gamesMap[g.game_date] = { title: g.title, year: g.year, seasons: g.seasons, clues: g.clues };
      });
    }

    // 3. Calculate career statistics
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

    let perfectScoresCount = 0;
    let clutchWinsCount = 0;
    let underTwoCluesCount = 0;
    let underTenCluesCount = 0;
    let decadeStreamingCount = 0; // 2010-2019
    let cableRoyaltyCount = 0; // < 2010
    let freshAiringCount = 0; // >= 2020
    const uniqueDecadesTv = new Set<number>();
    let miniSeriesCount = 0; // seasons === 1
    let multiSeasonCount = 0; // seasons >= 4
    let sevenSeasonsCount = 0; // seasons >= 7
    let marathonSagaCount = 0; // seasons >= 5
    let singleNameCount = 0;
    let dramaMysteryCount = 0;
    let catchphraseAceCount = 0;

    const dramaMysteryRegex = /\b(murder|detective|killer|investigation|crime|courtroom|lawyer|attorney|police|conspiracy|corrupt|secrets|family drama|betrayal|tragedy|scandal|syndicate|undercover|blackmail|missing|homicide|agent|fbi|sheriff)\b/i;

    (scores || []).forEach((s) => {
      const c = s.clues_used;
      if (c <= 3) distribution.psychic++;
      else if (c <= 10) distribution.buff++;
      else if (c <= 25) distribution.casual++;
      else if (c <= 39) distribution.detective++;
      else if (c === 40) distribution.skinOfTeeth++;

      if (s.score === 1000) perfectScoresCount++;
      if (c === 40) clutchWinsCount++;
      if (c <= 2) underTwoCluesCount++;
      if (c <= 10) underTenCluesCount++;

      const game = gamesMap[s.game_date];
      const year = game?.year;
      const seasons = game?.seasons;
      const title = game?.title || "";
      const clues = Array.isArray(game?.clues) ? game.clues : [];

      if (year) {
        if (year < 2010) cableRoyaltyCount++;
        if (year >= 2010 && year <= 2019) decadeStreamingCount++;
        if (year >= 2020) freshAiringCount++;
        uniqueDecadesTv.add(Math.floor(year / 10) * 10);
      }

      if (typeof seasons === "number") {
        if (seasons === 1) miniSeriesCount++;
        if (seasons >= 4) multiSeasonCount++;
        if (seasons >= 5) marathonSagaCount++;
        if (seasons >= 7) sevenSeasonsCount++;
      }

      if (title) {
        const trimmedTitle = title.trim();
        if (!trimmedTitle.includes(" ")) {
          singleNameCount++;
        }
      }

      if (clues.length >= c && c >= 1) {
        const winningClue = clues[c - 1] || "";
        const clueBadge = getClueBadge(winningClue, c);
        if (clueBadge.label === "Quote / Dialogue") catchphraseAceCount++;
      }

      const combinedText = `${title} ${clues.join(" ")}`;
      if (dramaMysteryRegex.test(combinedText)) dramaMysteryCount++;
    });

    // 4. Calculate current streak and max streak
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

    // 5. Match History
    const history = (scores || []).map((s) => ({
      gameDate: s.game_date,
      score: s.score,
      cluesUsed: s.clues_used,
      seriesTitle: gamesMap[s.game_date]?.title || "TV Series Mystery",
      seriesYear: gamesMap[s.game_date]?.year || "",
      seasons: gamesMap[s.game_date]?.seasons,
    }));

    // 6. TV Specific Badges & Milestones (26 Total)
    const badges = [
      {
        id: "first_win_tv",
        title: "Pilot Episode",
        desc: "Solve your very first TV series puzzle",
        icon: "📺",
        current: Math.min(1, totalPlayed),
        target: 1,
        unlocked: totalPlayed >= 1,
      },
      {
        id: "streak_3_tv",
        title: "Mini-Series",
        desc: "Achieve a 3-day TV daily streak",
        icon: "📼",
        current: Math.min(3, maxStreak),
        target: 3,
        unlocked: maxStreak >= 3,
      },
      {
        id: "streak_7_tv",
        title: "Season Finale",
        desc: "Reach a 7-day TV win streak",
        icon: "🔥",
        current: Math.min(7, maxStreak),
        target: 7,
        unlocked: maxStreak >= 7,
      },
      {
        id: "streak_14_tv",
        title: "Full Season Run",
        desc: "Maintain a 14-day daily TV streak",
        icon: "⚡",
        current: Math.min(14, maxStreak),
        target: 14,
        unlocked: maxStreak >= 14,
      },
      {
        id: "streak_30_tv",
        title: "Binge Addict",
        desc: "Achieve an epic 30-day TV series streak",
        icon: "🗓️",
        current: Math.min(30, maxStreak),
        target: 30,
        unlocked: maxStreak >= 30,
      },
      {
        id: "played_25_tv",
        title: "Couch Connoisseur",
        desc: "Solve 25 TV series puzzles across your career",
        icon: "🛋️",
        current: Math.min(25, totalPlayed),
        target: 25,
        unlocked: totalPlayed >= 25,
      },
      {
        id: "played_50_tv",
        title: "Network Executive",
        desc: "Solve 50 TV series puzzles across your career",
        icon: "🎖️",
        current: Math.min(50, totalPlayed),
        target: 50,
        unlocked: totalPlayed >= 50,
      },
      {
        id: "century_club_tv",
        title: "Syndication",
        desc: "Play and solve 100 TV series puzzles",
        icon: "🏆",
        current: Math.min(100, totalPlayed),
        target: 100,
        unlocked: totalPlayed >= 100,
      },
      {
        id: "score_10k_tv",
        title: "Golden Globe Tier",
        desc: "Accumulate over 10,000 total TV career points",
        icon: "💎",
        current: Math.min(10000, totalPoints),
        target: 10000,
        unlocked: totalPoints >= 10000,
      },
      {
        id: "score_25k_tv",
        title: "Emmy Laureate",
        desc: "Accumulate over 25,000 total TV career points",
        icon: "👑",
        current: Math.min(25000, totalPoints),
        target: 25000,
        unlocked: totalPoints >= 25000,
      },
      {
        id: "perfectionist_tv",
        title: "Prime Time",
        desc: "Score a maximum 1,000 pts on a TV puzzle",
        icon: "✨",
        current: Math.min(1, perfectScoresCount),
        target: 1,
        unlocked: perfectScoresCount >= 1,
      },
      {
        id: "psychic_strike_tv",
        title: "Binge Psychic",
        desc: "Deduce a TV series in 3 clues or fewer",
        icon: "🎯",
        current: Math.min(1, distribution.psychic),
        target: 1,
        unlocked: distribution.psychic >= 1,
      },
      {
        id: "skip_intro_tv",
        title: "Skip Intro",
        desc: "Deduce a TV series in just 1 or 2 clues",
        icon: "⚡",
        current: Math.min(1, underTwoCluesCount),
        target: 1,
        unlocked: underTwoCluesCount >= 1,
      },
      {
        id: "showrunner_instinct_tv",
        title: "Showrunner Instinct",
        desc: "Solve 5 TV series in 10 clues or fewer",
        icon: "🎬",
        current: Math.min(5, underTenCluesCount),
        target: 5,
        unlocked: underTenCluesCount >= 5,
      },
      {
        id: "cliffhanger_tv",
        title: "Mid-Season Cliffhanger",
        desc: "Solve a TV series on the 40th clue (Skin of Your Teeth)",
        icon: "🪢",
        current: Math.min(1, clutchWinsCount),
        target: 1,
        unlocked: clutchWinsCount >= 1,
      },
      {
        id: "marathon_saga_tv",
        title: "Marathon Saga",
        desc: "Solve 3 long-running TV series with 5+ seasons",
        icon: "🏔️",
        current: Math.min(3, marathonSagaCount),
        target: 3,
        unlocked: marathonSagaCount >= 3,
      },
      {
        id: "decade_streaming_tv",
        title: "Streaming Revolution",
        desc: "Deduce 5 series from the golden streaming decade (2010–2019)",
        icon: "📡",
        current: Math.min(5, decadeStreamingCount),
        target: 5,
        unlocked: decadeStreamingCount >= 5,
      },
      {
        id: "cable_royalty_tv",
        title: "Cable Royalty",
        desc: "Deduce 3 classic series released before 2010",
        icon: "📻",
        current: Math.min(3, cableRoyaltyCount),
        target: 3,
        unlocked: cableRoyaltyCount >= 3,
      },
      {
        id: "fresh_airing_tv",
        title: "Fresh Airing",
        desc: "Deduce 5 contemporary series released in 2020 or later",
        icon: "📺",
        current: Math.min(5, freshAiringCount),
        target: 5,
        unlocked: freshAiringCount >= 5,
      },
      {
        id: "decade_hopper_tv",
        title: "Decade Hopper TV",
        desc: "Solve series spanning at least 3 distinct decades",
        icon: "⏳",
        current: Math.min(3, uniqueDecadesTv.size),
        target: 3,
        unlocked: uniqueDecadesTv.size >= 3,
      },
      {
        id: "mini_series_purist_tv",
        title: "Mini-Series Purist",
        desc: "Solve 3 limited series with exactly 1 season",
        icon: "🎞️",
        current: Math.min(3, miniSeriesCount),
        target: 3,
        unlocked: miniSeriesCount >= 3,
      },
      {
        id: "multi_season_monster_tv",
        title: "Multi-Season Monster",
        desc: "Solve 5 enduring series with 4 or more seasons",
        icon: "📜",
        current: Math.min(5, multiSeasonCount),
        target: 5,
        unlocked: multiSeasonCount >= 5,
      },
      {
        id: "seven_seasons_club_tv",
        title: "Seven Seasons Club",
        desc: "Solve an epic TV juggernaut with 7+ seasons",
        icon: "🏰",
        current: Math.min(1, sevenSeasonsCount),
        target: 1,
        unlocked: sevenSeasonsCount >= 1,
      },
      {
        id: "single_name_hit_tv",
        title: "Single-Name Hit",
        desc: "Solve 5 TV series with a single-word title",
        icon: "🔤",
        current: Math.min(5, singleNameCount),
        target: 5,
        unlocked: singleNameCount >= 5,
      },
      {
        id: "drama_connoisseur_tv",
        title: "Drama & Mystery Connoisseur",
        desc: "Solve 5 gripping Drama, Crime, or Mystery series",
        icon: "🕵️",
        current: Math.min(5, dramaMysteryCount),
        target: 5,
        unlocked: dramaMysteryCount >= 5,
      },
      {
        id: "catchphrase_ace_tv",
        title: "Catchphrase Ace",
        desc: "Win 3 TV puzzles where your deciding clue was an iconic quote",
        icon: "🗣️",
        current: Math.min(3, catchphraseAceCount),
        target: 3,
        unlocked: catchphraseAceCount >= 3,
      },
    ];

    // Fetch custom profile info if available
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const finalDisplayName =
      profileRow?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "TV Detective";

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: finalDisplayName,
        avatar: profileRow?.avatar_url || user.user_metadata?.avatar_url || null,
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
  } catch (err: unknown) {
    console.error("API TV Profile crash:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const name = body?.name;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 25) {
      return NextResponse.json(
        { error: "Name must be between 2 and 25 characters" },
        { status: 400 }
      );
    }

    const check = await isNameForbidden(trimmedName);
    if (check.isForbidden) {
      return NextResponse.json(
        { error: "This name contains restricted or inappropriate language. Please choose another name." },
        { status: 400 }
      );
    }

    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: trimmedName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("TV Profile update error:", profileError.message);
      return NextResponse.json({ error: "Failed to update profile name" }, { status: 500 });
    }

    // 2. Also update anon_name in daily_scores_tv for this user
    await supabase
      .from("daily_scores_tv")
      .update({ anon_name: trimmedName })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, name: trimmedName });
  } catch (err: unknown) {
    console.error("API TV Profile PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update profile name" },
      { status: 500 }
    );
  }
}
