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
    .from("daily_games_tv")
    .select("id, game_date, clues")
    .eq("game_date", dateToUse)
    .maybeSingle();

  if (!game) {
    const fallback = await supabase
      .from("daily_games_tv")
      .select("id, game_date, clues")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    game = fallback.data;
    error = fallback.error;
  }

  return { game, error };
}

async function getGameSolutionForDate(targetDate?: string) {
  const dateToUse = (targetDate && DATE_REGEX.test(targetDate))
    ? targetDate
    : new Date().toISOString().split("T")[0];

  let { data: game, error } = await supabase
    .from("daily_games_tv")
    .select("id, game_date, title, year, clues")
    .eq("game_date", dateToUse)
    .maybeSingle();

  if (!game) {
    const fallback = await supabase
      .from("daily_games_tv")
      .select("id, game_date, title, year, clues")
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
      if (error) console.error("TV Game GET query error:", error.message);
      return NextResponse.json(
        { error: "No daily TV game found" },
        { status: 404 }
      );
    }

    const rawClues = (game.clues as string[]) || [];
    const deck = seededShuffle(rawClues, deckSeed);

    // Security: return only the first clue and shuffle seed
    return NextResponse.json({
      gameDate: game.game_date,
      totalClues: deck.length,
      deckSeed,
      initialClue: deck[0] || "No clue available",
    });
  } catch (err: any) {
    console.error("TV Game GET unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Request on Pass or Give Up action
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, deckSeed, clueNumber, gameDate } = body;

    if ((action !== "pass" && action !== "give_up") || !deckSeed || typeof clueNumber !== "number") {
      return NextResponse.json(
        { error: "Invalid action request" },
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

    if (action === "give_up") {
      if (clueNumber < 10) {
        return NextResponse.json(
          { error: "Surrendering is only available after seeing at least 10 clues." },
          { status: 400 }
        );
      }

      const { game, error } = await getGameSolutionForDate(gameDate);

      if (error || !game) {
        if (error) console.error("TV Game POST give_up query error:", error.message);
        return NextResponse.json(
          { error: "Daily TV game not found" },
          { status: 404 }
        );
      }

      const rawClues = (game.clues as string[]) || [];
      const deck = seededShuffle(rawClues, deckSeed);

      let posterPath: string | null = null;
      try {
        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (tmdbApiKey && game.title) {
          let res = await fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(
              game.title
            )}&first_air_date_year=${game.year}&include_adult=false`
          );
          let data = await res.json();

          if (!data.results || data.results.length === 0) {
            res = await fetch(
              `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(
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
        console.error("TMDB poster fetch error during TV give_up:", err);
      }

      return NextResponse.json({
        gameOver: true,
        hasGivenUp: true,
        solution: {
          title: game.title,
          year: game.year,
          poster: posterPath,
        },
        remainingClues: deck.slice(clueNumber),
      });
    }

    const { game, error } = await getGameForDate(gameDate);

    if (error || !game) {
      if (error) console.error("TV Game POST query error:", error.message);
      return NextResponse.json(
        { error: "Daily TV game not found" },
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
  } catch (err: unknown) {
    console.error("TV Game POST unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
