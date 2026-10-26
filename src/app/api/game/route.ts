import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { seededShuffle } from "@/lib/utils";

async function getGameForDate(targetDate?: string) {
  const dateToUse = targetDate || new Date().toISOString().split("T")[0];

  let { data: game, error } = await supabase
    .from("daily_games")
    .select("id, game_date, clues")
    .eq("game_date", dateToUse)
    .maybeSingle();

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

  return { game, error };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || undefined;
    const deckSeed =
      searchParams.get("deckSeed") || Math.random().toString(36).substring(2);

    const { game, error } = await getGameForDate(dateParam);

    if (error || !game) {
      return NextResponse.json(
        { error: "No daily game found" },
        { status: 404 }
      );
    }

    const rawClues = (game.clues as string[]) || [];
    const deck = seededShuffle(rawClues, deckSeed);

    // Securitate: trimitem doar primul indiciu și seed-ul de amestecare.
    // Viitoarele indicii nu sunt expuse în rețea până nu sunt deblocate legitim.
    return NextResponse.json({
      gameDate: game.game_date,
      totalClues: deck.length,
      deckSeed,
      initialClue: deck[0] || "No clue available",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}

// Cerere la trecerea prin Pass pentru a obține următorul indiciu pe rând
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, deckSeed, clueNumber, gameDate } = body;

    if (action !== "pass" || !deckSeed || !clueNumber) {
      return NextResponse.json(
        { error: "Invalid pass request" },
        { status: 400 }
      );
    }

    const { game, error } = await getGameForDate(gameDate);

    if (error || !game) {
      return NextResponse.json(
        { error: "Daily game not found" },
        { status: 404 }
      );
    }

    const rawClues = (game.clues as string[]) || [];
    const deck = seededShuffle(rawClues, deckSeed);

    const requestedIndex = clueNumber - 1;
    if (requestedIndex < 0 || requestedIndex >= deck.length) {
      return NextResponse.json(
        { error: "Clue index out of bounds" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      clueNumber,
      clue: deck[requestedIndex],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}