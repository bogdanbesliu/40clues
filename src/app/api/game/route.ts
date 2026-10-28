import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { seededShuffle } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/serverAuth";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function getGameForDate(targetDate?: string) {
  const dateToUse = (targetDate && DATE_REGEX.test(targetDate))
    ? targetDate
    : new Date().toISOString().split("T")[0];

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
    const today = new Date().toISOString().split("T")[0];

    // Restrict archive puzzles to signed-in users only
    if (dateParam && dateParam !== today) {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return NextResponse.json(
          {
            error: "Archive puzzles are only available to signed-in users.",
            isGuest: true,
          },
          { status: 403 }
        );
      }
    }

    const deckSeed =
      searchParams.get("deckSeed") || Math.random().toString(36).substring(2);

    const { game, error } = await getGameForDate(dateParam);

    if (error || !game) {
      if (error) console.error("Game GET query error:", error.message);
      return NextResponse.json(
        { error: "No daily game found" },
        { status: 404 }
      );
    }

    const rawClues = (game.clues as string[]) || [];
    const deck = seededShuffle(rawClues, deckSeed);

    // Security: return only the first clue and the shuffle seed.
    // Future clues are not exposed over the network until legitimately unlocked.
    return NextResponse.json({
      gameDate: game.game_date,
      totalClues: deck.length,
      deckSeed,
      initialClue: deck[0] || "No clue available",
    });
  } catch (err: any) {
    console.error("Game GET unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Request on Pass action to retrieve the next clue on demand
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, deckSeed, clueNumber, gameDate } = body;

    if (action !== "pass" || !deckSeed || typeof clueNumber !== "number") {
      return NextResponse.json(
        { error: "Invalid pass request" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Restrict archive puzzles to signed-in users only
    if (gameDate && gameDate !== today) {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        return NextResponse.json(
          {
            error: "Archive puzzles are only available to signed-in users.",
            isGuest: true,
          },
          { status: 403 }
        );
      }
    }

    const { game, error } = await getGameForDate(gameDate);

    if (error || !game) {
      if (error) console.error("Game POST query error:", error.message);
      return NextResponse.json(
        { error: "Daily game not found" },
        { status: 404 }
      );
    }

    const rawClues = (game.clues as string[]) || [];
    const deck = seededShuffle(rawClues, deckSeed);

    const clueIdx = clueNumber - 1;
    if (clueIdx < 0 || clueIdx >= deck.length) {
      return NextResponse.json(
        { error: "Invalid clue number" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      clueNumber,
      clue: deck[clueIdx],
    });
  } catch (err: any) {
    console.error("Game POST unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
