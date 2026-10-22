import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function normalizeString(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  try {
    const { guess, clueNumber, gameDate } = await request.json();

    if (!guess) {
      return NextResponse.json({ error: "Guess is required" }, { status: 400 });
    }

    const today = gameDate || new Date().toISOString().split("T")[0];

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
    const clues = (game.clues as string[]) || [];
    const isLastClue = clueNumber >= clues.length;

    let posterPath: string | null = null;

    if (isMatch || isLastClue) {
      try {
        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (tmdbApiKey) {
          // 1. Încercare de căutare cu an
          let res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
              game.title
            )}&year=${game.year}&include_adult=false`
          );
          let data = await res.json();

          // 2. Fallback: căutare fără an dacă titlul exact n-a returnat rezultate
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
      });
    }

    return NextResponse.json({
      correct: false,
      gameOver: isLastClue,
      solution: isLastClue
        ? { title: game.title, year: game.year, poster: posterPath }
        : null,
      nextClue: !isLastClue ? clues[clueNumber] : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}