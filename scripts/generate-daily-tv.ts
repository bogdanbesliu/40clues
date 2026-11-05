import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { getCandidateModels } from "../src/config/ai";

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

// Fetch a popular TV series dynamically from TMDB
async function fetchTargetTvShow(tmdbApiKey: string, playedTitles: Set<string>) {
  const randomPage = Math.floor(Math.random() * 15) + 1;
  const url = `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbApiKey}&language=en-US&sort_by=vote_count.desc&include_adult=false&vote_average.gte=7.0&vote_count.gte=1000&page=${randomPage}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB TV API request failed with status: ${res.status}`);
  }

  const data = await res.json();
  const shows = (data.results || []).filter(
    (s: any) => s.name && !playedTitles.has(s.name.toLowerCase().trim())
  );

  if (shows.length === 0) {
    throw new Error("No unplayed TV shows found on this TMDB page.");
  }

  const selected = shows[Math.floor(Math.random() * shows.length)];
  const releaseYear = selected.first_air_date
    ? parseInt(selected.first_air_date.split("-")[0], 10)
    : 2010;

  // Fetch full details to retrieve number of seasons
  let numberOfSeasons = 1;
  try {
    const detailRes = await fetch(
      `https://api.themoviedb.org/3/tv/${selected.id}?api_key=${tmdbApiKey}`
    );
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      if (typeof detailData.number_of_seasons === "number") {
        numberOfSeasons = detailData.number_of_seasons;
      }
    }
  } catch (err) {
    console.warn("Could not fetch detailed season count from TMDB, defaulting to 1:", err);
  }

  return {
    id: selected.id,
    title: selected.name,
    year: releaseYear,
    seasons: numberOfSeasons,
    overview: selected.overview || "",
  };
}

export async function runDailyTvGenerator() {
  console.log("📺 Starting daily TV series generator...");
  const { supabase, ai, tmdbApiKey } = getClients();

  // 1. Fetch already played TV shows
  const { data: pastGames, error: fetchErr } = await supabase
    .from("daily_games_tv")
    .select("title");

  if (fetchErr) {
    console.warn("⚠️ Warning fetching past TV games:", fetchErr.message);
  }

  const playedTitles = new Set(
    (pastGames || []).map((g) => g.title.toLowerCase().trim())
  );
  console.log(`Found ${playedTitles.size} previously played TV shows.`);

  // 2. Query TMDB for target TV show
  const selectedTv = await fetchTargetTvShow(tmdbApiKey, playedTitles);
  console.log(
    `🎯 Selected TV Series: "${selectedTv.title}" (${selectedTv.year}, ${selectedTv.seasons} season(s))`
  );

  // 3. Ask Gemini to generate 40 progressive clues with model fallback
  const prompt = `Generate exactly 40 witty, progressive trivia clues for the television series "${selectedTv.title}" (${selectedTv.year}), which has ${selectedTv.seasons} season(s).
Plot Synopsis: ${selectedTv.overview}

Guidelines for the 40 clues:
- Difficulty progression:
  - Clues 1-10: ultra-cryptic & subtle trivia (specific obscure background props, sets, pilot episode details, cinematography style, theme song/composer trivia).
  - Clues 11-25: moderately recognizable elements (character quirks, recurring motifs, memorable episode titles, catchphrases, relationships, workplace/location setting).
  - Clues 26-38: recognizable season plot arcs, pivotal storylines, famous twists, cliffhangers.
  - Clues 39-40: practically give it away (signature premise, defining quotes, unmistakable core dynamics).
- Clues must be engaging, creative, and strictly accurate.
- DO NOT mention the lead actor/actress real names or the show title directly in any clue.
- Return ONLY a valid JSON array of 40 strings.`;

  const candidateModels = getCandidateModels();
  let clues: string[] | null = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    console.log(`🤖 Attempting TV clue generation with Gemini model: "${modelName}"...`);
    try {
      const response = await ai.models.generateContent({
        model: modelName,
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

      const parsed: string[] = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length >= 40) {
        clues = parsed.slice(0, 40);
        console.log(`✅ Successfully generated ${clues.length} TV clues using model "${modelName}"!`);
        break;
      } else {
        throw new Error(`Invalid clue count generated: expected 40, got ${parsed?.length}`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️ Warning: Model "${modelName}" failed:`, err?.message || err);
      console.warn("Retrying with next candidate model if available...");
    }
  }

  if (!clues || clues.length < 40) {
    throw new Error(
      `Failed to generate clues across all candidate models (${candidateModels.join(", ")}). Last error: ${lastError?.message || lastError}`
    );
  }

  // 4. Save to Supabase for current date
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("daily_games_tv").upsert(
    {
      category: "tv",
      game_date: today,
      title: selectedTv.title,
      year: selectedTv.year,
      seasons: selectedTv.seasons,
      clues: clues,
    },
    { onConflict: "game_date" }
  );

  if (error) {
    throw new Error(`Supabase TV Upsert Error: ${error.message}`);
  }

  return {
    success: true,
    tvShow: selectedTv.title,
    year: selectedTv.year,
    seasons: selectedTv.seasons,
    cluesCount: clues.length,
    gameDate: today,
  };
}

if (process.argv[1] && process.argv[1].endsWith("generate-daily-tv.ts")) {
  runDailyTvGenerator()
    .then((res) => {
      console.log("✅ Generator finished:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Fatal Error:", err);
      process.exit(1);
    });
}
