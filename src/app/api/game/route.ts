import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().split("T")[0];

    // Căutăm jocul de azi
    let { data: game, error } = await supabase
      .from("daily_games")
      .select("id, game_date, clues")
      .eq("game_date", today)
      .maybeSingle();

    // Fallback: cel mai recent joc dacă cel de azi nu există încă
    if (!game) {
      const fallback = await supabase
        .from("daily_games")
        .select("id, game_date, clues")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      game = fallback.data;
      error = fallback.error;
    }

    if (error || !game) {
      return NextResponse.json(
        { error: "No daily game found" },
        { status: 404 }
      );
    }

    const clues = (game.clues as string[]) || [];

    return NextResponse.json({
      gameDate: game.game_date,
      totalClues: clues.length,
      allClues: clues,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}