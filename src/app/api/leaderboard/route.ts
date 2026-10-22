import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    // Top 10 jucători pentru ziua respectivă
    const { data: dailyTop, error } = await supabase
      .from("daily_scores")
      .select(`
        score,
        clues_used,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq("game_date", date)
      .order("score", { ascending: false })
      .order("clues_used", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaderboard: dailyTop || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}