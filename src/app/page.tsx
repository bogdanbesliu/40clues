"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  HelpCircle,
  Trophy,
  Loader2,
  Share2,
  Check,
  Flame,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MovieSearchInput from "@/components/MovieSearchInput";
import LeaderboardModal from "@/components/LeaderboardModal";
import { createBrowserClient } from "@supabase/ssr";

interface StoredGameProgress {
  gameDate: string;
  clueNumber: number;
  attempts: string[];
  unlockedClues: string[];
  hasWon: boolean;
  hasLost: boolean;
  solution: { title: string; year: number } | null;
}

export default function Home() {
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [totalClues, setTotalClues] = useState<number>(40);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [solution, setSolution] = useState<{ title: string; year: number } | null>(null);
  const [gameDate, setGameDate] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  const [user, setUser] = useState<any>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [isClueFading, setIsClueFading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        checkAndSyncPendingLocalScore(user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        checkAndSyncPendingLocalScore(activeUser.id);
      }
    });

    initGame();

    return () => subscription.unsubscribe();
  }, []);

  // Sincronizează automat scorul dacă utilizatorul a câștigat ca anonim și tocmai s-a logat
  const checkAndSyncPendingLocalScore = async (_userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const savedLocal = localStorage.getItem(`40clues_progress_${today}`);
    if (savedLocal) {
      try {
        const parsed: StoredGameProgress = JSON.parse(savedLocal);
        if (parsed.hasWon && parsed.solution) {
          const score = calculateScore(parsed.clueNumber);
          await syncScoreToDatabase(parsed.clueNumber, score, today);
        }
      } catch {}
    }
  };

  const initGame = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/game?clue=1");
      const data = await res.json();

      if (!res.ok) {
        setMessage("Could not load today's game. Check Supabase connection.");
        setIsLoading(false);
        return;
      }

      const today = data.gameDate;
      setGameDate(today);
      setTotalClues(data.totalClues);

      const savedStreak = parseInt(localStorage.getItem("40clues_streak") || "0", 10);
      setStreak(savedStreak);

      const savedLocal = localStorage.getItem(`40clues_progress_${today}`);
      if (savedLocal) {
        const parsed: StoredGameProgress = JSON.parse(savedLocal);
        setClueNumber(parsed.clueNumber);
        setAttempts(parsed.attempts || []);
        setUnlockedClues(parsed.unlockedClues || []);
        setHasWon(parsed.hasWon);
        setHasLost(parsed.hasLost);
        setSolution(parsed.solution);
      } else {
        setUnlockedClues([data.clue]);
        setClueNumber(1);
      }
    } catch {
      setMessage("Network error while loading game.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const syncScoreToDatabase = async (cluesUsed: number, score: number, targetDate?: string) => {
    try {
      await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameDate: targetDate || gameDate,
          cluesUsed,
          score,
        }),
      });
    } catch (err) {
      console.error("Failed to sync score:", err);
    }
  };

  const saveProgress = (
    nextClueNum: number,
    newAttempts: string[],
    newUnlockedClues: string[],
    won: boolean,
    lost: boolean,
    sol: { title: string; year: number } | null
  ) => {
    if (!gameDate) return;
    const progress: StoredGameProgress = {
      gameDate,
      clueNumber: nextClueNum,
      attempts: newAttempts,
      unlockedClues: newUnlockedClues,
      hasWon: won,
      hasLost: lost,
      solution: sol,
    };
    localStorage.setItem(`40clues_progress_${gameDate}`, JSON.stringify(progress));
  };

  const calculateScore = (cluesUsed: number) => {
    return Math.max(25, 1000 - (cluesUsed - 1) * 25);
  };

  const getRankBadge = (cluesCount: number) => {
    if (cluesCount <= 3) return "🎯 Cinephile Psychic";
    if (cluesCount <= 10) return "🍿 Film Buff";
    if (cluesCount <= 25) return "🎟️ Casual Viewer";
    if (cluesCount <= 39) return "🕵️ Desperate Detective";
    return "🪢 By the Skin of Your Teeth";
  };

  const updateStreakOnWin = () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem("40clues_streak", newStreak.toString());
  };

  const triggerErrorShake = () => {
    setIsShakeActive(true);
    setTimeout(() => setIsShakeActive(false), 500);
  };

  const handleMovieGuess = async (selectedTitle: string) => {
    if (!selectedTitle || hasWon || hasLost || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: selectedTitle, clueNumber, gameDate }),
      });
      const data = await res.json();

      if (data.correct) {
        setHasWon(true);
        const sol = { title: data.title, year: data.year };
        setSolution(sol);
        setMessage("Correct! Brilliant deduction!");
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        updateStreakOnWin();
        const score = calculateScore(clueNumber);
        saveProgress(clueNumber, attempts, unlockedClues, true, false, sol);
        if (user) {
          syncScoreToDatabase(clueNumber, score);
        }
      } else {
        triggerErrorShake();
        const newAttempts = [selectedTitle, ...attempts];
        setAttempts(newAttempts);

        if (data.gameOver) {
          setHasLost(true);
          setSolution(data.solution);
          setMessage(`Game over! The movie was: ${data.solution.title} (${data.solution.year})`);
          localStorage.setItem("40clues_streak", "0");
          setStreak(0);
          saveProgress(clueNumber, newAttempts, unlockedClues, false, true, data.solution);
        } else {
          // Tranziție fină de fade între indicii
          setIsClueFading(true);
          setTimeout(() => {
            const nextNum = clueNumber + 1;
            const newUnlocked = [...unlockedClues, data.nextClue];
            setClueNumber(nextNum);
            setUnlockedClues(newUnlocked);
            setIsClueFading(false);
            setMessage("Incorrect! Next clue unlocked.");
            saveProgress(nextNum, newAttempts, newUnlocked, false, false, null);
          }, 150);
        }
      }
    } catch {
      setMessage("Error checking answer. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    const finalScore = calculateScore(clueNumber);
    const shareText = `40Clues #Cinema 🎬\n💡 ${clueNumber}/${totalClues} clues used\n🏆 ${finalScore} pts\n🔥 ${streak}-day streak\n\nhttps://40clues.vercel.app`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="max-w-xl w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            40Clues
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold mt-0.5">
            Cinema Edition
          </p>
        </div>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div
              className="flex items-center gap-1.5 text-xs font-bold text-orange-300 bg-orange-950/70 border border-orange-800/80 px-3 py-2 rounded-full shadow-sm"
              title={`${streak}-day win streak`}
            >
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" aria-hidden="true" />
              <span>{streak}</span>
            </div>
          )}

          {/* Touch target de min 44x44px */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-colors"
            title="Open Daily Leaderboard"
            aria-label="Open Daily Leaderboard"
          >
            <Trophy className="w-5 h-5" aria-hidden="true" />
          </button>

          {user ? (
            <div className="flex items-center gap-1.5">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata?.full_name || "User profile"}
                  className="w-9 h-9 rounded-full border border-slate-600 object-cover"
                />
              )}
              <button
                onClick={handleSignOut}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-slate-100 hover:bg-slate-900 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition-colors"
                title="Sign out of account"
                aria-label="Sign out of account"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="min-h-[44px] flex items-center gap-2 text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/80 px-3.5 rounded-full text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-colors"
            >
              <LogIn className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-xl w-full flex flex-col gap-6">
        {/* Active Clue Card */}
        <section
          aria-labelledby="active-clue-heading"
          className="relative overflow-hidden bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur min-h-[150px] flex flex-col justify-center"
        >
          {isLoading ? (
            <div
              className="flex items-center justify-center gap-3 text-slate-300"
              aria-live="polite"
            >
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" aria-hidden="true" />
              <span className="font-medium">Fetching today's clue...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2.5">
                <span
                  id="active-clue-heading"
                  className="flex items-center gap-1.5 text-amber-400 font-bold"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Clue #{clueNumber} of{" "}
                  {totalClues}
                </span>
                <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-amber-300">
                  Potential: {calculateScore(clueNumber)} pts
                </span>
              </div>
              <p
                aria-live="polite"
                className={`text-lg md:text-xl font-medium text-slate-100 leading-relaxed italic transition-all duration-200 ${
                  isClueFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
                }`}
              >
                "{unlockedClues[unlockedClues.length - 1]}"
              </p>
            </>
          )}
        </section>

        {/* Live Status Message */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl text-sm font-semibold text-center transition-all shadow-sm ${
              hasWon
                ? "bg-emerald-950/90 border border-emerald-700 text-emerald-200"
                : hasLost
                ? "bg-rose-950/90 border border-rose-700 text-rose-200"
                : "bg-slate-900 border border-slate-700/80 text-slate-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Search Input / Final Victory Card */}
        {!hasWon && !hasLost ? (
          <MovieSearchInput
            disabled={isLoading || isSubmitting}
            isErrorShake={isShakeActive}
            onSelectMovie={handleMovieGuess}
          />
        ) : (
          <section
            aria-label="Game Result"
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center flex flex-col items-center gap-4 shadow-xl"
          >
            <Trophy
              className={`w-14 h-14 ${hasWon ? "text-amber-400" : "text-slate-600"}`}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                {hasWon ? "Movie Solved!" : "Better Luck Tomorrow!"}
              </h2>
              {solution && (
                <p className="text-sm text-slate-300 mt-1.5">
                  The movie was:{" "}
                  <strong className="text-slate-100 text-base font-bold">
                    {solution.title} ({solution.year})
                  </strong>
                </p>
              )}
            </div>

            {hasWon && (
              <div className="flex flex-col gap-1 items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800 w-full shadow-inner">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Final Score
                </span>
                <span className="text-3xl font-extrabold text-amber-400">
                  {calculateScore(clueNumber)} pts
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-1 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                  {getRankBadge(clueNumber)}
                </span>
              </div>
            )}

            {!user && hasWon && (
              <button
                onClick={handleGoogleLogin}
                className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Sign in with Google to enter Leaderboard</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {hasCopied ? (
                <>
                  <Check className="w-5 h-5 text-white" aria-hidden="true" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" aria-hidden="true" />
                  <span>Share Result</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* Collapsible Unlocked Clues History */}
        {unlockedClues.length > 1 && (
          <div className="flex flex-col border border-slate-800/90 bg-slate-900/40 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              aria-expanded={isHistoryExpanded}
              aria-controls="unlocked-clues-section"
              className="min-h-[44px] w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-900/60 transition-colors"
            >
              <span>Previous Unlocked Clues ({unlockedClues.length - 1})</span>
              {isHistoryExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
              )}
            </button>

            {isHistoryExpanded && (
              <div
                id="unlocked-clues-section"
                className="flex flex-col gap-2 p-3 border-t border-slate-800/80 max-h-56 overflow-y-auto"
              >
                {unlockedClues
                  .slice(0, -1)
                  .reverse()
                  .map((c, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg text-xs text-slate-300 italic leading-relaxed"
                    >
                      "{c}"
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Incorrect Guesses History */}
        {attempts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Incorrect guesses ({attempts.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {attempts.map((attempt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800/90 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between text-slate-300"
                >
                  <span className="font-medium text-slate-200">{attempt}</span>
                  <span className="text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-900/80 px-2 py-0.5 rounded">
                    Incorrect
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameDate={gameDate}
      />
    </main>
  );
}