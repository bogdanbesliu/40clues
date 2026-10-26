import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { seededShuffle } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/serverAuth";

function normalizeString(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  try {
    const { guess, clueNumber, gameDate, deckSeed } = await request.json();

    if (!guess) {
      return NextResponse.json({ error: "Guess is required" }, { status: 400 });
    }

    const currentToday = new Date().toISOString().split("T")[0];
    const today = gameDate || currentToday;

    // Restrict archive puzzles to signed-in users only
    if (gameDate && gameDate !== currentToday) {
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

    let { data: game, error } = await supabase
      .from("daily_games")
      .select("title, year, clues")
      .eq("game_date", today)
      .maybeSingle();

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
      return NextResponse.json({ error: "Game not found in database" }, { status: 404 });
    }

    const isMatch = normalizeString(guess) === normalizeString(game.title);
    const rawClues = (game.clues as string[]) || [];
    const deck = deckSeed ? seededShuffle(rawClues, deckSeed) : rawClues;
    const isLastClue = clueNumber >= deck.length;

    let posterPath: string | null = null;

    if (isMatch || isLastClue) {
      try {
        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (tmdbApiKey) {
          // 1. Search attempt with release year
          let res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
              game.title
            )}&year=${game.year}&include_adult=false`
          );
          let data = await res.json();

          // 2. Fallback: search without year if exact title yielded no results
          if (!data.results || data.results.length === 0) {
            res = await fetch(
              `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
                game.title
              )}&include_adult=false`
            );
            data = await res.json();
          }

          if (data.results?.[0]?.poster_path) {
            posterPath = `https://image.tmdb.org/t/p/w342${data.results[0].poster_path}`;
          }
        }
      } catch (err) {
        console.error("TMDB Poster fetch error:", err);
      }
    }

    if (isMatch) {
      return NextResponse.json({
        correct: true,
        title: game.title,
        year: game.year,
        poster: posterPath,
        remainingClues: deck.slice(clueNumber),
      });
    }

    return NextResponse.json({
      correct: false,
      gameOver: isLastClue,
      solution: isLastClue
        ? { title: game.title, year: game.year, poster: posterPath }
        : null,
      nextClue: !isLastClue ? deck[clueNumber] : null,
      remainingClues: isLastClue ? deck.slice(clueNumber) : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}