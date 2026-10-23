import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const geminiApiKey = process.env.GEMINI_API_KEY || "";
  const tmdbApiKey = process.env.TMDB_API_KEY || "";

  if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey || !tmdbApiKey) {
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

  // Alegem un film nefolosit din lotul descărcat
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
  const { supabase, ai, tmdbApiKey } = getClients();

  // 1. Verificăm jocurile din Supabase
  const { data: playedGames } = await supabase.from("daily_games").select("title");
  const playedTitles = new Set(playedGames?.map((g) => (g.title || "").toLowerCase().trim()) || []);

  const selectedMovie = await fetchTargetMovie(tmdbApiKey, playedTitles);
  console.log(`🎯 Target: "${selectedMovie.title}" (${selectedMovie.year})`);

  // 2. Prompt calibrat conform celor 40 de indicii din Game Design
  const prompt = `
Generate 40 clues for the trivia game "40Clues".
Target Movie: "${selectedMovie.title}" (${selectedMovie.year}).
Context: "${selectedMovie.overview}".

EXACT DISTRIBUTION (40 CLUES):
- 24 clues (60%): Genuine, clever plot points, props, scene events, or key dilemmas.
- 4 clues (10%): Completely irrelevant, absurdly specific, funny background details (100% true in the movie).
- 4 clues (10%): Behind-the-scenes trivia, budget quirks, or viral pop culture memes.
- 4 clues (10%): Memorable or funny quotes/dialogue out of context.
- 4 clues (10%): Sarcastic "explain a plot badly" summaries of scenes.

STRICT RULES:
- Never include the movie title: "${selectedMovie.title}".
- Never name leading actors or characters directly.
- Output MUST be a JSON object with a single field "clues" containing exactly 40 strings.
`;

  // 3. Apel rapid cu fallback pe gemini-3.8-flash și gemini-3.5-flash-lite
  const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
  let clues: string[] = [];

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clues: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["clues"],
          },
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed.clues) && parsed.clues.length >= 35) {
          clues = parsed.clues.slice(0, 40);
          break;
        }
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} error:`, err?.message || err);
    }
  }

  if (clues.length === 0) {
    throw new Error("Failed to generate clues from Gemini models.");
  }

  // 4. Salvare în Supabase pentru data curentă (sau update dacă există deja)
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