import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/serverAuth";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getIgnoredConfig() {
  const envNames = (process.env.IGNORED_LEADERBOARD_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const envIds = (process.env.IGNORED_LEADERBOARD_USER_IDS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return {
    names: Array.from(new Set(envNames)),
    ids: Array.from(new Set(envIds)),
  };
}

function isIgnoredUser(name?: string | null, userId?: string | null): boolean {
  const { names, ids } = getIgnoredConfig();

  if (userId && ids.includes(userId.toLowerCase())) {
    return true;
  }

  if (name) {
    const trimmed = name.trim().toLowerCase();
    // Use exact match to avoid filtering out innocent users with similar names
    if (names.includes(trimmed)) {
      return true;
    }
  }

  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const dateParam = searchParams.get("date");
  const today = new Date().toISOString().split("T")[0];
  const date = (dateParam && DATE_REGEX.test(dateParam)) ? dateParam : today;

  try {
    if (type === "global") {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return NextResponse.json(
          {
            error: "Sign in with Google is required to access Global Leaderboards.",
            isGuest: true,
            leaderboard: [],
          },
          { status: 401 }
        );
      }

      // Global Leaderboards: Top registered users by total score (All-Time Hall of Fame)
      const { data: globalTop, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_score, games_played, current_streak")
        .gt("total_score", 0)
        .order("total_score", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Leaderboard global query error:", error.message);
        return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
      }

      const filtered = (globalTop || [])
        .filter((p) => !isIgnoredUser(p.display_name, p.id))
        .slice(0, 20);

      const formatted = filtered.map((p) => ({
        score: p.total_score || 0,
        clues_used: p.games_played || 0,
        streak: p.current_streak || 0,
        profiles: {
          display_name: p.display_name || "Detective",
          avatar_url: p.avatar_url || null,
        },
      }));

      return NextResponse.json({ leaderboard: formatted });
    }

    // Daily Leaderboard: Top scores for date (both authenticated and guests)
    const { data: dailyTop, error } = await supabase
      .from("daily_scores")
      .select(`
        user_id,
        score,
        clues_used,
        anon_name,
        created_at,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq("game_date", date)
      .order("score", { ascending: false })
      .order("clues_used", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Leaderboard daily query error:", error.message);
      return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
    }

    const filteredDaily = (dailyTop || [])
      .filter((entry) => {
        const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
        return (
          !isIgnoredUser(entry.anon_name, entry.user_id) &&
          !isIgnoredUser(profile?.display_name, entry.user_id)
        );
      })
      .slice(0, 20);

    return NextResponse.json({ leaderboard: filteredDaily });
  } catch (err: any) {
    console.error("Leaderboard GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
