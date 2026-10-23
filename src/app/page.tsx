"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Film,
  Sparkles,
  Trophy,
  Share2,
  Check,
  HelpCircle,
  Flame,
  User,
  LogOut,
  ChevronRight,
  Eye,
  RotateCcw,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface MovieClue {
  index: number;
  text: string;
}

interface DailyGameData {
  game_date: string;
  title: string;
  year: number;
  clues: string[];
}

export default function HomePage() {
  const [game, setGame] = useState<DailyGameData | null>(null);
  const [shuffledDeck, setShuffledDeck] = useState<MovieClue[]>([]);
  const [revealedCount, setRevealedCount] = useState<number>(1);
  const [guessInput, setGuessInput] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cluesEndRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // Scor dinamic conform formulei din Game Design: max(25, 1000 - (clues - 1) * 25)
  const score = useMemo(() => {
    if (!isWon) return 0;
    return Math.max(25, 1000 - (revealedCount - 1) * 25);
  }, [isWon, revealedCount]);

  // Verificare utilizator activ
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Încărcare joc zilnic cu fallback și validare structură
  useEffect(() => {
    async function loadDailyGame() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Încercăm endpoint-urile posibile ale proiectului
        let res = await fetch("/api/daily-game");
        if (!res.ok) {
          res = await fetch("/api/game");
        }
        if (!res.ok) throw new Error("Could not load daily movie puzzle");

        const data = await res.json();
        const movieGame = data.game || data; // În caz că răspunsul este { game: { ... } }
        setGame(movieGame);

        // Normalizăm indiciile (string sau obiect)
        const rawCluesList: any[] = movieGame.clues || movieGame.clues_list || [];
        const normalizedClues: string[] = rawCluesList.map((c: any) =>
          typeof c === "string" ? c : c.text || c.clue || String(c)
        );

        const storageKey = `40clues_deck_${movieGame.game_date}`;
        let loadedDeck: MovieClue[] = [];

        try {
          const savedDeckStr = localStorage.getItem(storageKey);
          if (savedDeckStr) {
            const parsed = JSON.parse(savedDeckStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedDeck = parsed;
            }
          }
        } catch {
          // ignora JSON parse error
        }

        // Dacă nu avem deck salvat valid în localStorage, îl generăm
        if (loadedDeck.length === 0 && normalizedClues.length > 0) {
          const indexed = normalizedClues.map((text, idx) => ({
            index: idx + 1,
            text,
          }));

          // Shuffle Fisher-Yates
          for (let i = indexed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
          }
          loadedDeck = indexed;
          localStorage.setItem(storageKey, JSON.stringify(loadedDeck));
        }

        setShuffledDeck(loadedDeck);

        // Restaurare progres
        const progressKey = `40clues_progress_${movieGame.game_date}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            setRevealedCount(parsed.revealedCount || 1);
            setGuesses(parsed.guesses || []);
            setIsWon(parsed.isWon || false);
            setIsGameOver(parsed.isGameOver || false);
          } catch {
            // ignora
          }
        }
      } catch (err: any) {
        console.error("Failed to load daily game:", err);
        setErrorMsg(err.message || "Failed to load game");
      } finally {
        setIsLoading(false);
      }
    }

    loadDailyGame();
  }, []);

  // Salvare stare la progres
  useEffect(() => {
    if (!game) return;
    const progressKey = `40clues_progress_${game.game_date}`;
    localStorage.setItem(
      progressKey,
      JSON.stringify({
        revealedCount,
        guesses,
        isWon,
        isGameOver,
      })
    );
  }, [revealedCount, guesses, isWon, isGameOver, game]);

  // Autoscroll la deblocarea unui nou indiciu
  useEffect(() => {
    cluesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [revealedCount]);

  // Autentificare Google cu redirect la profil sau homepage
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Salvare scor în baza de date Supabase la victorie
  const recordWinToDatabase = async (finalClues: number, finalScore: number) => {
    if (!user || !game) return;
    try {
      await supabase.from("user_scores").upsert(
        {
          user_id: user.id,
          game_date: game.game_date,
          score: finalScore,
          clues_used: finalClues,
        },
        { onConflict: "user_id,game_date" }
      );
    } catch (e) {
      console.error("Score sync error", e);
    }
  };

  // Verificare ghicire titlu
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isWon || isGameOver || !game) return;

    const cleanInput = guessInput.trim().toLowerCase();
    const cleanTarget = game.title.toLowerCase();

    // Verificare potrivire
    const isCorrect =
      cleanInput === cleanTarget ||
      cleanInput.replace(/[^a-z0-9]/g, "") === cleanTarget.replace(/[^a-z0-9]/g, "");

    const newGuesses = [...guesses, guessInput.trim()];
    setGuesses(newGuesses);
    setGuessInput("");

    if (isCorrect) {
      setIsWon(true);
      const finalScore = Math.max(25, 1000 - (revealedCount - 1) * 25);
      recordWinToDatabase(revealedCount, finalScore);
    } else {
      // Dacă a greșit, deblocăm următorul indiciu dacă mai există
      if (revealedCount < shuffledDeck.length) {
        setRevealedCount((prev) => prev + 1);
      } else {
        setIsGameOver(true);
      }
    }
  };

  // Butonul de Pass / Reveal Next Clue
  const handlePassClue = () => {
    if (isWon || isGameOver) return;
    if (revealedCount < shuffledDeck.length) {
      setRevealedCount((prev) => prev + 1);
    } else {
      setIsGameOver(true);
    }
  };

  // Generator de grilă Wordle-style fără spoilere
  const generateShareText = () => {
    const totalClues = 40;
    const cluesCount = Math.min(revealedCount, totalClues);
    const puzzleDate = game?.game_date ? game.game_date.replace(/-/g, ".") : "Daily";

    let grid = "";
    if (isWon) {
      const yellowCount = Math.max(0, cluesCount - 1);
      const yellowSquares = "🟨".repeat(yellowCount);
      const fullSequence = yellowSquares + "🟩";

      for (let i = 0; i < fullSequence.length; i += 5) {
        grid += fullSequence.slice(i, i + 5) + "\n";
      }
    } else {
      grid = "⬛⬛⬛⬛⬛\n";
    }

    const streakDisplay = streak > 0 ? ` • 🔥 ${streak}-day streak` : "";

    return `40Clues #${puzzleDate} 🎬\n💡 ${cluesCount}/${totalClues} clues used\n🏆 ${score} pts${streakDisplay}\n\n${grid.trim()}\nhttps://40clues.com`;
  };

  const handleShare = async () => {
    const text = generateShareText();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "40Clues: Daily Cinema Deduction",
          text: text,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2500);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed", err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-4 sm:py-6 selection:bg-amber-500/30 font-sans">
      <div className="max-w-xl w-full flex flex-col gap-4 flex-1">
        {/* Header Principal */}
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
              40
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-100">
                40Clues
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold ml-1.5 uppercase tracking-wider">
                Cinema
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all shadow-sm group"
                  title="View Profile & Career Stats"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-6 h-6 rounded-full border border-amber-400/80 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                      {(user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-amber-300 hidden sm:inline">
                    Profile
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-rose-400 active:scale-95 rounded-lg transition-all p-1.5 hover:bg-slate-900"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                title="Sign in with Google"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Status Bar */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Clue <strong className="text-amber-400">{revealedCount}</strong> / 40
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Value:{" "}
              <strong className="text-emerald-400">
                {Math.max(25, 1000 - (revealedCount - 1) * 25)} pts
              </strong>
            </span>
          </div>
        </div>

        {/* Deck-ul de Indicii Vizibile */}
        <section aria-label="Deck of clues" className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[48vh] pr-1">
          {shuffledDeck.length === 0 && (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 text-center text-xs text-slate-400">
              {isLoading ? "Decrypting daily movie clues..." : "No clues available for today."}
            </div>
          )}

          {shuffledDeck.slice(0, revealedCount).map((clue, idx) => {
            const isLatest = idx === revealedCount - 1;
            return (
              <article
                key={clue.index}
                className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all duration-300 ${isLatest
                  ? "bg-slate-900 border-amber-500/50 text-slate-100 shadow-md ring-1 ring-amber-500/20"
                  : "bg-slate-900/40 border-slate-800/60 text-slate-300"
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400/80 uppercase">
                    Clue #{idx + 1}
                  </span>
                  {isLatest && (
                    <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                      New
                    </span>
                  )}
                </div>
                <p>{clue.text}</p>
              </article>
            );
          })}
          <div ref={cluesEndRef} />
        </section>

        {/* Panou de Final de Joc (Victorie / Eșec) */}
        {(isWon || isGameOver) && (
          <section aria-label="Game result" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col items-center text-center gap-4 shadow-xl">
            {isWon ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
                  🎉
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-100">
                    Cinema Mastermind!
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    You solved it in{" "}
                    <strong className="text-amber-400">{revealedCount}</strong> clues
                    and earned{" "}
                    <strong className="text-emerald-400">{score} points</strong>.
                  </p>
                  <p className="text-sm font-bold text-slate-200 mt-2">
                    🎬 {game?.title} ({game?.year})
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl">
                  🍿
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Mystery Closed!</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    The secret movie was:
                  </p>
                  <p className="text-base font-black text-amber-400 mt-1">
                    🎬 {game?.title} ({game?.year})
                  </p>
                </div>
              </>
            )}

            {/* Butonul Wordle-Style Social Share */}
            <button
              type="button"
              onClick={handleShare}
              className="w-full min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
              {hasCopied ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Share Your Score</span>
                </>
              )}
            </button>

            {/* Invitație Guest -> Google pentru salvarea streak-ului */}
            {!user && (
              <div className="w-full pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Sign in with Google to protect your streaks and climb the leaderboard!
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Score with Google</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Input & Formular Ghicire */}
        {!isWon && !isGameOver && (
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <form onSubmit={handleGuessSubmit} className="flex gap-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Guess the secret movie..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!guessInput.trim()}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 rounded-xl transition-all flex items-center justify-center active:scale-95"
              >
                Guess
              </button>
            </form>

            <button
              type="button"
              onClick={handlePassClue}
              className="w-full py-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Pass / Next Clue (-25 pts)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}