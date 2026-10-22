export interface ClueBadge {
    label: string;
    emoji: string;
    colorClass: string;
  }
  
  export function getClueBadge(clueText: string, clueIndex: number): ClueBadge {
    const text = clueText.trim();
  
    // 1. Citate / Replici (ghilimele sau verbe de zicere)
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")) ||
      text.includes("is told:") ||
      text.includes("says:") ||
      text.includes("screams:") ||
      text.includes("whispers:")
    ) {
      return {
        label: "Quote / Dialogue",
        emoji: "🗣️",
        colorClass: "bg-indigo-950/70 border-indigo-700/80 text-indigo-300",
      };
    }
  
    // 2. Culise / Producție / Trivia
    if (
      text.toLowerCase().includes("budget") ||
      text.toLowerCase().includes("actor") ||
      text.toLowerCase().includes("director") ||
      text.toLowerCase().includes("scene") ||
      text.toLowerCase().includes("filming") ||
      text.toLowerCase().includes("box office") ||
      text.toLowerCase().includes("take") ||
      text.toLowerCase().includes("prop")
    ) {
      return {
        label: "Behind the Scenes",
        emoji: "🎬",
        colorClass: "bg-amber-950/70 border-amber-700/80 text-amber-300",
      };
    }
  
    // 3. Rezumat comic / Explain a plot badly
    if (
      text.toLowerCase().includes("basically") ||
      text.toLowerCase().includes("because someone") ||
      text.toLowerCase().includes("a local") ||
      text.toLowerCase().includes("protagonist") ||
      text.toLowerCase().includes("accidentally")
    ) {
      return {
        label: "Bad Plot Summary",
        emoji: "📖",
        colorClass: "bg-purple-950/70 border-purple-700/80 text-purple-300",
      };
    }
  
    // 4. Detalii Absurde / Trivia irelevantă
    if (
      text.toLowerCase().includes("background") ||
      text.toLowerCase().includes("parking") ||
      text.toLowerCase().includes("coffee") ||
      text.toLowerCase().includes("visible") ||
      text.toLowerCase().includes("wearing")
    ) {
      return {
        label: "Absurd Detail",
        emoji: "🤪",
        colorClass: "bg-rose-950/70 border-rose-700/80 text-rose-300",
      };
    }
  
    // 5. Categorie implicită (Plot & Story Clue - 60% din mix)
    return {
      label: "Plot & Story Clue",
      emoji: "🔍",
      colorClass: "bg-emerald-950/70 border-emerald-700/80 text-emerald-300",
    };
  }