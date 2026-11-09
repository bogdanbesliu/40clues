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

    // 1. Fetch all user scores from daily_scores
    const { data: scores, error: scoresError } = await supabase
      .from("daily_scores")
      .select("game_date, score, clues_used, created_at")
      .eq("user_id", user.id)
      .order("game_date", { ascending: false });

    if (scoresError) {
      console.error("Profile GET scores query error:", scoresError.message);
      return NextResponse.json({ error: "Failed to fetch user scores" }, { status: 500 });
    }

    // 2. Fetch movie titles for history & badge computation
    const gameDates = (scores || []).map((s) => s.game_date);
    const gamesMap: Record<string, { title: string; year: number; clues?: string[] }> = {};

    if (gameDates.length > 0) {
      const { data: games } = await supabase
        .from("daily_games")
        .select("game_date, title, year, clues")
        .in("game_date", gameDates);

      (games || []).forEach((g) => {
        gamesMap[g.game_date] = { title: g.title, year: g.year, clues: g.clues };
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
    let underTenCluesCount = 0;
    let underTwoCluesCount = 0;
    let classicPre2000Count = 0;
    let decade90sCount = 0;
    let decade00sCount = 0;
    let decade10sPlusCount = 0;
    const uniqueDecades = new Set<number>();
    let singleWordTitleCount = 0;
    let franchiseCount = 0;
    let sciFiFantasyCount = 0;
    let actionCrimeCount = 0;
    let quoteWinCount = 0;
    let behindCurtainWinCount = 0;

    const sciFiRegex = /\b(space|planet|alien|aliens|future|futuristic|robot|robots|cyborg|spaceship|galaxy|dimension|time travel|magic|wizard|sorcerer|spell|dragon|superpower|mutant|dystopia|dystopian|cyberpunk|cloning|artificial intelligence|android|starship|interstellar|multiverse|extraterrestrial)\b/i;
    const actionCrimeRegex = /\b(heist|robbery|murder|detective|cop|police|assassin|hitman|mafia|cartel|gangster|conspiracy|hostage|explosion|shootout|chase|weapon|sniper|spy|espionage|fbi|cia|counter-terrorist|revenge|undercover|martial arts|lethal|bullet)\b/i;

    (scores || []).forEach((s) => {
      const c = s.clues_used;
      if (c <= 3) distribution.psychic++;
      else if (c <= 10) distribution.buff++;
      else if (c <= 25) distribution.casual++;
      else if (c <= 39) distribution.detective++;
      else if (c === 40) distribution.skinOfTeeth++;

      if (s.score === 1000) perfectScoresCount++;
      if (c === 40) clutchWinsCount++;
      if (c <= 10) underTenCluesCount++;
      if (c <= 2) underTwoCluesCount++;

      const game = gamesMap[s.game_date];
      const year = game?.year;
      const title = game?.title || "";
      const clues = Array.isArray(game?.clues) ? game.clues : [];

      if (year) {
        if (year < 2000) classicPre2000Count++;
        if (year >= 1990 && year <= 1999) decade90sCount++;
        if (year >= 2000 && year <= 2009) decade00sCount++;
        if (year >= 2010) decade10sPlusCount++;
        uniqueDecades.add(Math.floor(year / 10) * 10);
      }

      if (title) {
        const trimmedTitle = title.trim();
        if (!trimmedTitle.includes(" ")) {
          singleWordTitleCount++;
        }
        if (/[:0-9]|\b(part|chapter|vol|ii|iii|iv|v|returns|forever|rises|reloaded|revolution|awakens|strikes)\b/i.test(trimmedTitle)) {
          franchiseCount++;
        }
      }

      if (clues.length >= c && c >= 1) {
        const winningClue = clues[c - 1] || "";
        const clueBadge = getClueBadge(winningClue, c);
        if (clueBadge.label === "Quote / Dialogue") quoteWinCount++;
        if (clueBadge.label === "Behind the Scenes") behindCurtainWinCount++;
      }

      const combinedText = `${title} ${clues.join(" ")}`;
      if (sciFiRegex.test(combinedText)) sciFiFantasyCount++;
      if (actionCrimeRegex.test(combinedText)) actionCrimeCount++;
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

    // 5. Istoric meciuri
    const history = (scores || []).map((s) => ({
      gameDate: s.game_date,
      score: s.score,
      cluesUsed: s.clues_used,
      movieTitle: gamesMap[s.game_date]?.title || "Cinema Mystery",
      movieYear: gamesMap[s.game_date]?.year || "",
    }));

    // 6. Badges (26 Total)
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
        title: "Fortnight Master",
        desc: "Maintain a 14-day daily movie streak",
        icon: "⚡",
        current: Math.min(14, maxStreak),
        target: 14,
        unlocked: maxStreak >= 14,
      },
      {
        id: "streak_30",
        title: "Monthly Legend",
        desc: "Achieve an epic 30-day movie streak",
        icon: "🗓️",
        current: Math.min(30, maxStreak),
        target: 30,
        unlocked: maxStreak >= 30,
      },
      {
        id: "played_25",
        title: "Silver Screen Regular",
        desc: "Solve 25 movie puzzles across your career",
        icon: "🍿",
        current: Math.min(25, totalPlayed),
        target: 25,
        unlocked: totalPlayed >= 25,
      },
      {
        id: "played_50",
        title: "Half-Century Sleuth",
        desc: "Solve 50 movie puzzles across your career",
        icon: "🎖️",
        current: Math.min(50, totalPlayed),
        target: 50,
        unlocked: totalPlayed >= 50,
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
        id: "score_10k",
        title: "Box Office Mogul",
        desc: "Accumulate over 10,000 total career points",
        icon: "💎",
        current: Math.min(10000, totalPoints),
        target: 10000,
        unlocked: totalPoints >= 10000,
      },
      {
        id: "score_25k",
        title: "High Roller Club",
        desc: "Accumulate over 25,000 total career points",
        icon: "👑",
        current: Math.min(25000, totalPoints),
        target: 25000,
        unlocked: totalPoints >= 25000,
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
        id: "psychic_strike",
        title: "Cinephile Psychic",
        desc: "Deduce a film in 3 clues or fewer",
        icon: "🎯",
        current: Math.min(1, distribution.psychic),
        target: 1,
        unlocked: distribution.psychic >= 1,
      },
      {
        id: "cold_open",
        title: "Cold Open",
        desc: "Deduce a film in just 1 or 2 clues",
        icon: "👁️",
        current: Math.min(1, underTwoCluesCount),
        target: 1,
        unlocked: underTwoCluesCount >= 1,
      },
      {
        id: "sharp_detective",
        title: "Sharp Detective",
        desc: "Solve 5 movies in 10 clues or fewer",
        icon: "🔍",
        current: Math.min(5, underTenCluesCount),
        target: 5,
        unlocked: underTenCluesCount >= 5,
      },
      {
        id: "photo_finish",
        title: "Photo Finish",
        desc: "Solve a movie on the 40th clue (Skin of Your Teeth)",
        icon: "⏱️",
        current: Math.min(1, clutchWinsCount),
        target: 1,
        unlocked: clutchWinsCount >= 1,
      },
      {
        id: "golden_age",
        title: "Golden Age Explorer",
        desc: "Solve 3 classic films released before the year 2000",
        icon: "🎞️",
        current: Math.min(3, classicPre2000Count),
        target: 3,
        unlocked: classicPre2000Count >= 3,
      },
      {
        id: "decade_90s",
        title: "90s Nostalgia",
        desc: "Deduce 5 films released during the 1990s",
        icon: "📼",
        current: Math.min(5, decade90sCount),
        target: 5,
        unlocked: decade90sCount >= 5,
      },
      {
        id: "decade_00s",
        title: "Millennium Mania",
        desc: "Deduce 5 films released in the 2000s",
        icon: "💿",
        current: Math.min(5, decade00sCount),
        target: 5,
        unlocked: decade00sCount >= 5,
      },
      {
        id: "decade_10s",
        title: "Modern Cinema Buff",
        desc: "Deduce 5 modern films released from 2010 onwards",
        icon: "🎥",
        current: Math.min(5, decade10sPlusCount),
        target: 5,
        unlocked: decade10sPlusCount >= 5,
      },
      {
        id: "decade_hopper",
        title: "Decade Hopper",
        desc: "Solve films spanning across at least 4 different decades",
        icon: "⏳",
        current: Math.min(4, uniqueDecades.size),
        target: 4,
        unlocked: uniqueDecades.size >= 4,
      },
      {
        id: "single_word",
        title: "One-Word Icon",
        desc: "Solve 5 movies whose title is a single word",
        icon: "🔤",
        current: Math.min(5, singleWordTitleCount),
        target: 5,
        unlocked: singleWordTitleCount >= 5,
      },
      {
        id: "franchise_fan",
        title: "Franchise Fanatic",
        desc: "Solve 3 sequels or franchise movies",
        icon: "🍿",
        current: Math.min(3, franchiseCount),
        target: 3,
        unlocked: franchiseCount >= 3,
      },
      {
        id: "genre_scifi",
        title: "Sci-Fi & Fantasy Voyager",
        desc: "Solve 5 Science Fiction or Fantasy films",
        icon: "🚀",
        current: Math.min(5, sciFiFantasyCount),
        target: 5,
        unlocked: sciFiFantasyCount >= 5,
      },
      {
        id: "genre_action",
        title: "Adrenaline Pulse",
        desc: "Solve 5 high-octane Action, Thriller, or Crime films",
        icon: "💥",
        current: Math.min(5, actionCrimeCount),
        target: 5,
        unlocked: actionCrimeCount >= 5,
      },
      {
        id: "quote_scholar",
        title: "Quote Scholar",
        desc: "Win 3 games where your deciding clue was a memorable quote",
        icon: "🗣️",
        current: Math.min(3, quoteWinCount),
        target: 3,
        unlocked: quoteWinCount >= 3,
      },
      {
        id: "behind_curtain",
        title: "Behind the Curtain",
        desc: "Win 3 games where your deciding clue was a production secret",
        icon: "🎬",
        current: Math.min(3, behindCurtainWinCount),
        target: 3,
        unlocked: behindCurtainWinCount >= 3,
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
      "Detective";

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
    console.error("API Profile crash:", err);
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
      console.error("Profile update error:", profileError.message);
      return NextResponse.json({ error: "Failed to update profile name" }, { status: 500 });
    }

    // 2. Also update anon_name in daily_scores for this user so historical leaderboards display the new name
    await supabase
      .from("daily_scores")
      .update({ anon_name: trimmedName })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, name: trimmedName });
  } catch (err: unknown) {
    console.error("API Profile PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update profile name" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const userId = user.id;

    // Use admin client if service role key is available to purge user and cascade
    const adminOrClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    // 1. Delete all user records from daily_scores
    const { error: scoresDeleteError } = await adminOrClient
      .from("daily_scores")
      .delete()
      .eq("user_id", userId);

    if (scoresDeleteError) {
      console.error("Failed to delete user daily_scores:", scoresDeleteError.message);
    }

    // 2. Delete user profile
    const { error: profileDeleteError } = await adminOrClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Failed to delete user profile:", profileDeleteError.message);
    }

    // 3. Delete auth account from Supabase Auth admin API if service role is present
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error("Failed to delete auth user from auth.users:", authDeleteError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account and associated data permanently deleted.",
    });
  } catch (err: unknown) {
    console.error("API Profile DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
