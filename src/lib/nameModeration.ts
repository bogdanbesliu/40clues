import { createClient } from "@supabase/supabase-js";

// Initialize server-side Supabase client with service role key if available to bypass RLS securely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServer = createClient(supabaseUrl, supabaseKey);

// Fallback seed list to ensure moderation is 100% active even before database table creation
const FALLBACK_FORBIDDEN_WORDS = [
  // Reserved / Impersonation
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "official",
  "support",
  "system",
  "root",
  "40clues",
  "creator",

  // Hate Speech & Discrimination
  "nigger",
  "nigga",
  "nazi",
  "hitler",
  "faggot",
  "fag",
  "kike",
  "spic",
  "chink",
  "retard",
  "tranny",
  "shemale",

  // Severe Vulgarities
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "motherfucker",
  "dickhead",
  "pussy",

  // Explicit Sexual Content
  "porn",
  "pedo",
  "pedophile",
  "rapist",
  "rape",
  "blowjob",
  "dildo",
  "jizz",
  "cum",

  // Extreme Violence & Harm
  "terrorist",
  "genocide",
  "suicide",
  "killall",
];

// In-memory cache for database words (refreshed every 10 minutes)
let cachedWords: string[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000;

/**
 * Normalizes text to defeat common leetspeak and obfuscation tricks.
 */
function normalizeText(text: string): { cleaned: string; collapsed: string } {
  const lower = text.toLowerCase();

  // Substitute common leetspeak characters
  const leetSubstitutions: Record<string, string> = {
    "@": "a",
    "4": "a",
    "3": "e",
    "1": "i",
    "!": "i",
    "|": "i",
    "0": "o",
    "5": "s",
    "$": "s",
    "7": "t",
    "+": "t",
    "8": "b",
    "9": "g",
  };

  let substituted = "";
  for (const char of lower) {
    substituted += leetSubstitutions[char] || char;
  }

  // Remove non-alphanumeric punctuation and spaces
  const cleaned = substituted.replace(/[^a-z0-9]/g, "");

  // Collapse consecutive duplicate letters (e.g. "fuuuuck" -> "fuck")
  const collapsed = cleaned.replace(/(.)\1+/g, "$1");

  return { cleaned, collapsed };
}

/**
 * Loads forbidden words from Supabase forbidden_words table with in-memory caching.
 */
async function getForbiddenWords(): Promise<string[]> {
  const now = Date.now();
  if (cachedWords && now - lastCacheTime < CACHE_DURATION_MS) {
    return cachedWords;
  }

  try {
    const { data, error } = await supabaseServer
      .from("forbidden_words")
      .select("word");

    if (!error && data && data.length > 0) {
      cachedWords = data.map((row) => row.word.toLowerCase());
      lastCacheTime = now;
      return cachedWords;
    }
  } catch (err) {
    console.warn("Could not fetch forbidden_words from database, using fallback list:", err);
  }

  return FALLBACK_FORBIDDEN_WORDS;
}

/**
 * Checks whether a proposed display name contains forbidden or offensive language.
 */
export async function isNameForbidden(name: string): Promise<{ isForbidden: boolean; reason?: string }> {
  if (!name || typeof name !== "string") {
    return { isForbidden: false };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isForbidden: true, reason: "Name is too short." };
  }

  const { cleaned, collapsed } = normalizeText(trimmed);
  const words = await getForbiddenWords();

  for (const forbidden of words) {
    const term = forbidden.toLowerCase();

    // 1. Exact match with cleaned or collapsed text
    if (cleaned === term || collapsed === term) {
      return {
        isForbidden: true,
        reason: "This name contains restricted or inappropriate language.",
      };
    }

    // 2. Substring match for dangerous slurs & profanities (length >= 4)
    if (term.length >= 4 && (cleaned.includes(term) || collapsed.includes(term))) {
      return {
        isForbidden: true,
        reason: "This name contains restricted or inappropriate language.",
      };
    }

    // 3. For short terms (< 4 chars e.g. "fag", "mod"), check exact matches or word boundaries
    if (term.length < 4) {
      const tokens = trimmed.toLowerCase().split(/[\s._\-+]+/);
      if (tokens.includes(term)) {
        return {
          isForbidden: true,
          reason: "This name contains restricted or inappropriate language.",
        };
      }
    }
  }

  return { isForbidden: false };
}
