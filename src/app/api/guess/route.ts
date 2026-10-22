import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function normalizeString(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ""); // elimină spații, cratime, semne de punctuație
}

export async function POST(request: Request) {
  try {
    const { guess, clueNumber, gameDate } = await request.json();

    if (!guess) {
      return NextResponse.json({ error: "Guess is required" }, { status: 400 });
    }

    const today = gameDate || new Date().toISOString().split("T")[0];

    // 1. Căutăm jocul după data cerută
    let { data: game, error } = await supabase
      .from("daily_games")
      .select("title, year, clues")
      .eq("game_date", today)
      .maybeSingle();

    // 2. Fallback: dacă nu îl găsește după dată, îl ia pe cel mai recent generat
    if (!game) {
      const fallback = await supabase
        .from("daily_games")
        .select("title, year, clues")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      game = fallback.data;
      error = fallback.error;
    }

    if (error || !game) {
      console.error("Supabase query error in /api/guess:", error);
      return NextResponse.json({ error: "Game not found in database" }, { status: 404 });
    }

    const isMatch = normalizeString(guess) === normalizeString(game.title);
    const clues = (game.clues as string[]) || [];
    const isLastClue = clueNumber >= clues.length;

    if (isMatch) {
      return NextResponse.json({
        correct: true,
        title: game.title,
        year: game.year,
      });
    }

    return NextResponse.json({
      correct: false,
      gameOver: isLastClue,
      solution: isLastClue ? { title: game.title, year: game.year } : null,
      nextClue: !isLastClue ? clues[clueNumber] : null,
    });
  } catch (err: any) {
    console.error("Error in /api/guess POST:", err);
    return NextResponse.json({ error: "Internal server error", details: err?.message }, { status: 500 });
  }
}