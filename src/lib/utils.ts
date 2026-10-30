export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deterministic pseudo-random shuffle based on a seed string.
 * Allows each user to have their own unique random shuffle that the server
 * can reproduce on-demand without sending all clues to the client upfront.
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }

  // Fast Mulberry32 PRNG
  const random = () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalizes movie titles for forgiving matching across adaptations, remakes, and manual entry:
 * - Decomposes diacritics / accents (e.g., "Amélie" -> "amelie")
 * - Normalizes ampersands and plus signs to "and" ("Pride & Prejudice" -> "pride and prejudice")
 * - Standardizes common Roman numerals to digits ("Rocky II" -> "rocky 2")
 * - Strips trailing 4-digit release years if manually entered (e.g., "(2005)", "2005")
 * - Strips all non-alphanumeric characters and extra whitespace
 */
export function normalizeMovieTitle(title: string): string {
  if (!title) return "";
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s*\(\d{4}\)$/, "")
    .replace(/\s+\d{4}$/, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " and ")
    .replace(/\bviii\b/g, "8")
    .replace(/\bvii\b/g, "7")
    .replace(/\bvi\b/g, "6")
    .replace(/\biv\b/g, "4")
    .replace(/\bv\b/g, "5")
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1")
    .replace(/[^a-z0-9]/g, "");
}
