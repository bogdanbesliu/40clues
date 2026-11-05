import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/serverAuth";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TMDB_TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

export async function POST(request: Request) {
  try {
    const { type, gameDate } = await request.json();

    if (type !== "seasons" && type !== "genre") {
      return NextResponse.json(
        { error: "Invalid lifeline type. Must be 'seasons' or 'genre'." },
        { status: 400 }
      );
    }

    const currentToday = new Date().toISOString().split("T")[0];
    const today = (gameDate && DATE_REGEX.test(gameDate)) ? gameDate : currentToday;

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
      .from("daily_games_tv")
      .select("title, year, seasons")
      .eq("game_date", today)
      .maybeSingle();

    if (!game) {
      const fallback = await supabase
        .from("daily_games_tv")
        .select("title, year, seasons")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      game = fallback.data;
      error = fallback.error;
    }

    if (error || !game) {
      if (error) console.error("TV Lifeline query error:", error.message);
      return NextResponse.json(
        { error: "Daily TV game not found" },
        { status: 404 }
      );
    }

    const tmdbApiKey = process.env.TMDB_API_KEY;

    // 1. Number of Seasons lifeline
    if (type === "seasons") {
      if (typeof game.seasons === "number" && game.seasons > 0) {
        const hint = game.seasons === 1
          ? "Ran for 1 season (or limited miniseries)"
          : `Ran for ${game.seasons} seasons`;
        return NextResponse.json({
          type: "seasons",
          hint,
          seasons: game.seasons,
        });
      }

      let seasonsCount: number | null = null;
      if (tmdbApiKey) {
        try {
          const searchRes = await fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(
              game.title
            )}&first_air_date_year=${game.year}&include_adult=false`
          );
          const searchData = await searchRes.json();
          const showId = searchData.results?.[0]?.id;

          if (showId) {
            const detailRes = await fetch(
              `https://api.themoviedb.org/3/tv/${showId}?api_key=${tmdbApiKey}`
            );
            const detailData = await detailRes.json();
            if (typeof detailData.number_of_seasons === "number") {
              seasonsCount = detailData.number_of_seasons;
            }
          }
        } catch (err) {
          console.error("TMDB TV seasons fetch error:", err);
        }
      }

      const finalCount = seasonsCount || 1;
      const hint = finalCount === 1
        ? "Ran for 1 season (or limited miniseries)"
        : `Ran for ${finalCount} seasons`;

      return NextResponse.json({
        type: "seasons",
        hint,
        seasons: finalCount,
      });
    }

    // 2. Primary Genre lifeline (queried from TMDB)
    let genreNames: string[] = [];

    if (tmdbApiKey) {
      try {
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

        const show = data.results?.[0];
        if (show?.genre_ids && Array.isArray(show.genre_ids)) {
          genreNames = show.genre_ids
            .map((id: number) => TMDB_TV_GENRES[id])
            .filter(Boolean);
        }
      } catch (err) {
        console.error("TMDB TV genre fetch error:", err);
      }
    }

    const primaryGenre = genreNames.slice(0, 2).join(" / ") || "Drama";
    const hint = `Classified as ${primaryGenre}`;

    return NextResponse.json({
      type: "genre",
      hint,
      genre: primaryGenre,
    });
  } catch (err: unknown) {
    console.error("TV Lifeline unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
