import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Încarcă .env.local doar dacă fișierul există fizic (pe localhost)
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const tmdbApiKey = process.env.TMDB_API_KEY || "";

if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey || !tmdbApiKey) {
  console.error("❌ Missing required API keys in .env.local (GEMINI_API_KEY, TMDB_API_KEY, Supabase keys)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Funcție care extrage un film aleatoriu dar relevant din TMDB
async function fetchRandomPopularMovie() {
  // Selectăm o pagină random din primele 25 de pagini cu filme apreciate
  const randomPage = Math.floor(Math.random() * 25) + 1;
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=en-US&sort_by=vote_count.desc&include_adult=false&vote_average.gte=6.5&vote_count.gte=1000&page=${randomPage}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB API request failed with status: ${res.status}`);
  }

  const data = await res.json();
  const movies = data.results || [];
  if (movies.length === 0) {
    throw new Error("No movies found from TMDB");
  }

  // Luăm un film random din pagina descărcată
  const randomMovie = movies[Math.floor(Math.random() * movies.length)];
  const releaseYear = randomMovie.release_date ? parseInt(randomMovie.release_date.split("-")[0], 10) : 2000;

  return {
    title: randomMovie.title,
    year: releaseYear,
    overview: randomMovie.overview,
  };
}

async function runDailyGenerator() {
  console.log("🎬 Fetching movie from TMDB API...");
  
  // 1. Verificăm filmele deja jucate din Supabase
  const { data: playedGames } = await supabase.from("daily_games").select("title");
  const playedTitles = new Set(playedGames?.map((g) => g.title.toLowerCase()) || []);

  let selectedMovie;
  let attempts = 0;

  // Căutăm până găsim un film care nu a mai fost jucat
  while (!selectedMovie && attempts < 10) {
    attempts++;
    const candidate = await fetchRandomPopularMovie();
    if (!playedTitles.has(candidate.title.toLowerCase())) {
      selectedMovie = candidate;
    }
  }

  if (!selectedMovie) {
    throw new Error("Could not find an unplayed movie after 10 attempts.");
  }

  console.log(`🎯 Selected Movie: "${selectedMovie.title}" (${selectedMovie.year})`);

  // 2. Promptul calibrat conform regulilor de joc stabilite
  const prompt = `
You are generating clues for "40Clues", a daily cinema trivia game.
Target Movie: "${selectedMovie.title}" (${selectedMovie.year})
Overview context: "${selectedMovie.overview}"

Generate EXACTLY 40 clues in English according to this distribution:
- 24 clues (60%): Genuinely helpful clues about plot points, key props, scene events, or director decisions.
- 4 clues (10%): Completely irrelevant, absurdly specific, or hilarious background trivia that is 100% factual in the movie (e.g. background prop, number of items, weather anomaly).
- 4 clues (10%): Contextual trivia, behind-the-scenes stories, budget quirks, or viral pop culture memes born from the movie.
- 4 clues (10%): Memorable or funny quotes and dialogue lines taken completely out of context.
- 4 clues (10%): Comedic or sarcastic "explain a plot badly" summaries of scenes.

STRICT RULES:
- Tone: witty, playful, or slightly sarcastic. Never dry or academic.
- NEVER include the actual title: "${selectedMovie.title}".
- NEVER include the actual names of the actors or characters.
- Shuffle the 40 clues completely randomly.
- Output MUST be a JSON object with a single field "clues" containing exactly 40 string items.
`;

  console.log("🤖 Generating 40 clues using Gemini...");

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          clues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of exactly 40 shuffled clues",
          },
        },
        required: ["clues"],
      },
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  const clues: string[] = parsed.clues || [];

  if (clues.length !== 40) {
    console.warn(`⚠️ Warning: LLM generated ${clues.length} clues instead of 40.`);
  }

  // 3. Salvăm în Supabase pentru data de azi (sau actualizăm dacă există deja)
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
    console.error("❌ Supabase Upsert Error:", error.message);
  } else {
    console.log(`✅ SUCCESS! "${selectedMovie.title}" (${selectedMovie.year}) with 40 clues saved to Supabase for ${today}!`);
  }
}

runDailyGenerator().catch(console.error);