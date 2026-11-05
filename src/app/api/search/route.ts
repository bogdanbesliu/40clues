import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return NextResponse.json({ error: "TMDB API key missing" }, { status: 500 });
  }

  try {
    const endpoint = type === "tv" ? "search/tv" : "search/movie";
    const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbApiKey}&query=${encodeURIComponent(
      query
    )}&include_adult=false&language=en-US&page=1`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    
    // Keep top 6 most popular results
    const items = (data.results || [])
      .slice(0, 6)
      .map((item: any) => ({
        id: item.id,
        title: type === "tv" ? item.name : item.title,
        year: type === "tv"
          ? (item.first_air_date ? item.first_air_date.split("-")[0] : "")
          : (item.release_date ? item.release_date.split("-")[0] : ""),
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null,
      }));

    return NextResponse.json({ results: items });
  } catch {
    return NextResponse.json({ results: [] });
  }
}