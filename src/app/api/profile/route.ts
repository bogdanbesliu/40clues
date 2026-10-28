import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isNameForbidden } from "@/lib/nameModeration";

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

    // 2. Fetch movie titles for history
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
    let underFiveCluesCount = 0;

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

    // 6. Badges
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
        id: "psychic_strike",
        title: "Cinephile Psychic",
        desc: "Deduce a film in 3 clues or fewer",
        icon: "🎯",
        current: Math.min(1, distribution.psychic),
        target: 1,
        unlocked: distribution.psychic >= 1,
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
        id: "century_club",
        title: "Century Club",
        desc: "Play and solve 100 cinema puzzles",
        icon: "🏆",
        current: Math.min(100, totalPlayed),
        target: 100,
        unlocked: totalPlayed >= 100,
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
  } catch (err: any) {
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
  } catch (err: any) {
    console.error("API Profile PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update profile name" },
      { status: 500 }
    );
  }
}
