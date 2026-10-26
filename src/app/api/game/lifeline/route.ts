import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export async function POST(request: Request) {
  try {
    const { type, gameDate } = await request.json();

    if (type !== "decade" && type !== "genre") {
      return NextResponse.json(
        { error: "Invalid lifeline type. Must be 'decade' or 'genre'." },
        { status: 400 }
      );
    }

    const today = gameDate || new Date().toISOString().split("T")[0];

    let { data: game, error } = await supabase
      .from("daily_games")
      .select("title, year")
      .eq("game_date", today)
      .maybeSingle();

    if (!game) {
      const fallback = await supabase
        .from("daily_games")
        .select("title, year")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      game = fallback.data;
      error = fallback.error;
    }

    if (error || !game) {
      return NextResponse.json(
        { error: "Daily game not found" },
        { status: 404 }
      );
    }

    // 1. Release Decade lifeline
    if (type === "decade") {
      const releaseYear = Number(game.year) || 2000;
      const decadeStart = Math.floor(releaseYear / 10) * 10;
      const hint = `Released in the ${decadeStart}s (${decadeStart}–${decadeStart + 9})`;
      return NextResponse.json({
        type: "decade",
        hint,
        decade: `${decadeStart}s`,
      });
    }

    // 2. Primary Genre lifeline (queried from TMDB)
    const tmdbApiKey = process.env.TMDB_API_KEY;
    let genreNames: string[] = [];

    if (tmdbApiKey) {
      try {
        let res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
            game.title
          )}&year=${game.year}&include_adult=false`
        );
        let data = await res.json();
        let firstResult = data.results?.[0];

        // Fallback: search without year if exact title + year didn't match
        if (!firstResult) {
          res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
              game.title
            )}&include_adult=false`
          );
          data = await res.json();
          firstResult = data.results?.[0];
        }

        if (firstResult && Array.isArray(firstResult.genre_ids)) {
          genreNames = firstResult.genre_ids
            .map((id: number) => TMDB_GENRES[id])
            .filter(Boolean);
        }
      } catch (err) {
        console.error("TMDB genre lookup error:", err);
      }
    }

    const genreText =
      genreNames.length > 0 ? genreNames.slice(0, 2).join(" / ") : "Feature Film";

    return NextResponse.json({
      type: "genre",
      hint: `Primary Genre: ${genreText}`,
      genre: genreText,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 }
    );
  }
}
