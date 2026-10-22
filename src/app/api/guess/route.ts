import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clueNumber = parseInt(searchParams.get("clue") || "1", 10);
  const today = new Date().toISOString().split("T")[0];

  // 1. Încercăm să găsim jocul cu data de azi
  let { data: game, error } = await supabase
    .from("daily_games")
    .select("id, game_date, clues")
    .eq("game_date", today)
    .maybeSingle();

  // 2. Fallback: dacă nu există un joc pentru azi, luăm cel mai recent joc existent
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
      { error: "No game found in Supabase", details: error?.message },
      { status: 404 }
    );
  }

  const clues = game.clues as string[];
  const targetIndex = Math.max(0, Math.min(clueNumber - 1, clues.length - 1));

  return NextResponse.json({
    gameId: game.id,
    gameDate: game.game_date,
    totalClues: clues.length,
    currentClueNumber: targetIndex + 1,
    clue: clues[targetIndex],
  });
}