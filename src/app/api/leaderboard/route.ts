import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

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

      // Global Leaderboards: Top 20 registered users by total score (All-Time Hall of Fame)
      const { data: globalTop, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, total_score, games_played, current_streak")
        .gt("total_score", 0)
        .order("total_score", { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const formatted = (globalTop || []).map((p) => ({
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

    // Daily Leaderboard: Top 20 scores for today (both authenticated and guests)
    const { data: dailyTop, error } = await supabase
      .from("daily_scores")
      .select(`
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
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaderboard: dailyTop || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}