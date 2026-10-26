import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return NextResponse.json({ error: "TMDB API key missing" }, { status: 500 });
  }

  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(
      query
    )}&include_adult=false&language=en-US&page=1`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    
    // Keep top 6 most popular results
    const movies = (data.results || [])
      .slice(0, 6)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        year: m.release_date ? m.release_date.split("-")[0] : "",
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : null,
      }));

    return NextResponse.json({ results: movies });
  } catch {
    return NextResponse.json({ results: [] });
  }
}