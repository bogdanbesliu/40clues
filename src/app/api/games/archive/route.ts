import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all daily games up to today, descending by date
    const { data: games, error } = await supabase
      .from("daily_games")
      .select("id, game_date, year")
      .lte("game_date", today)
      .order("game_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ games: games || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
