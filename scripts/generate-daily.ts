import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  const tmdbApiKey = process.env.TMDB_API_KEY || "";

  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for daily generation script");
  }

  if (!geminiApiKey || !supabaseUrl || !tmdbApiKey) {
    throw new Error(
      "Missing required API keys in environment (GEMINI_API_KEY, TMDB_API_KEY, Supabase keys)"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  return { supabase, ai, tmdbApiKey };
}

// Extrage un film dinamic într-un singur apel rapid la TMDB
async function fetchTargetMovie(tmdbApiKey: string, playedTitles: Set<string>) {
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=en-US&sort_by=vote_count.desc&include_adult=false&vote_average.gte=7.0&vote_count.gte=2000&page=${randomPage}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB API request failed with status: ${res.status}`);
  }

  const data = await res.json();
  const movies = (data.results || []).filter(
    (m: any) => m.title && !playedTitles.has(m.title.toLowerCase().trim())
  );

  if (movies.length === 0) {
    throw new Error("No unplayed movies found on this TMDB page.");
  }

  // Pick an unused film from the fetched list
  const selected = movies[Math.floor(Math.random() * movies.length)];
  const releaseYear = selected.release_date
    ? parseInt(selected.release_date.split("-")[0], 10)
    : 2000;

  return {
    title: selected.title,
    year: releaseYear,
    overview: selected.overview || "",
  };
}

export async function runDailyGenerator() {
  console.log("🎬 Starting daily movie generator...");
  const { supabase, ai, tmdbApiKey } = getClients();

  // 1. Fetch already played movies to prevent repetitions
  const { data: pastGames, error: fetchErr } = await supabase
    .from("daily_games")
    .select("title");

  if (fetchErr) {
    console.warn("⚠️ Warning fetching past games:", fetchErr.message);
  }

  const playedTitles = new Set(
    (pastGames || []).map((g) => g.title.toLowerCase().trim())
  );
  console.log(`Found ${playedTitles.size} previously played movies.`);

  // 2. Query TMDB directly for target movie
  const selectedMovie = await fetchTargetMovie(tmdbApiKey, playedTitles);
  console.log(
    `🎯 Selected Movie: "${selectedMovie.title}" (${selectedMovie.year})`
  );

  // 3. Ask Gemini 3.8 Flash to generate all 40 progressive clues
  const prompt = `Generate exactly 40 witty, progressive trivia clues for the film "${selectedMovie.title}" (${selectedMovie.year}).
Plot Synopsis: ${selectedMovie.overview}

Guidelines for the 40 clues:
- Difficulty progression: Clues 1-10 must be ultra-cryptic/subtle (e.g. background props, cinematography, trivia). Clues 11-25 moderately recognizable (themes, character quirks). Clues 26-38 obvious plot/dialogue elements. Clues 39-40 practically give it away.
- Clues must be engaging, creative, and strictly accurate.
- DO NOT mention the actor names or the movie title directly in any clue.
- Return ONLY a valid JSON array of 40 strings.`;

  console.log("Generating clues with Gemini 3.8 Flash...");
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
      },
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error("No response received from Gemini API");
  }

  const clues: string[] = JSON.parse(rawJson);
  if (!Array.isArray(clues) || clues.length < 40) {
    throw new Error(
      `Invalid clue count generated: expected 40, got ${clues?.length}`
    );
  }

  console.log(`Successfully generated ${clues.length} clues!`);

  // 4. Save to Supabase for current date (or update if already exists)
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("daily_games").upsert(
    {
      category: "movie",
      game_date: today,
      title: selectedMovie.title,
      year: selectedMovie.year,
      clues: clues,
    },
    { onConflict: "game_date" }
  );

  if (error) {
    throw new Error(`Supabase Upsert Error: ${error.message}`);
  }

  return {
    success: true,
    movie: selectedMovie.title,
    year: selectedMovie.year,
    cluesCount: clues.length,
    gameDate: today,
  };
}

if (process.argv[1] && process.argv[1].endsWith("generate-daily.ts")) {
  runDailyGenerator()
    .then((res) => {
      console.log("✅ Generator finished:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Fatal Error:", err);
      process.exit(1);
    });
}
