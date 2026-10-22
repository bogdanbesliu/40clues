"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Sparkles, HelpCircle, Trophy, Loader2, Share2, Check, Flame, LogIn, LogOut } from "lucide-react";
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
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    initGame();

    return () => subscription.unsubscribe();
  }, []);

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

  const syncScoreToDatabase = async (cluesUsed: number, score: number) => {
    try {
      await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameDate, cluesUsed, score }),
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
          const nextNum = clueNumber + 1;
          const newUnlocked = [...unlockedClues, data.nextClue];
          setClueNumber(nextNum);
          setUnlockedClues(newUnlocked);
          setMessage("Incorrect! Next clue unlocked.");
          saveProgress(nextNum, newAttempts, newUnlocked, false, false, null);
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
    const shareText = `40Clues #Cinema 🎬\n💡 ${clueNumber}/${totalClues} clues used\n🏆 ${finalScore} pts\n🔥 ${streak}-day streak\n\nhttps://40clues.com`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 font-sans">
      {/* Header */}
      <header className="max-w-xl w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            40Clues
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Cinema Edition</p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-800/80 px-2.5 py-1.5 rounded-full">
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              <span>{streak}</span>
            </div>
          )}

          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 transition-colors"
            title="Daily Leaderboard"
          >
            <Trophy className="w-4 h-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-slate-700"
                />
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-400 hover:text-slate-200 p-1.5"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-full text-slate-200 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-xl w-full flex flex-col gap-6">
        {/* Active Clue Card */}
        <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur min-h-[140px] flex flex-col justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span>Fetching clue...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span className="flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Latest Clue #{clueNumber}
                </span>
                <span>Current Potential: {calculateScore(clueNumber)} pts</span>
              </div>
              <p className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed italic">
                "{unlockedClues[unlockedClues.length - 1]}"
              </p>
            </>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium text-center transition-all ${
              hasWon
                ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
                : hasLost
                ? "bg-rose-950/80 border border-rose-800 text-rose-300"
                : "bg-slate-900 border border-slate-800 text-slate-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Search Input / Final Card */}
        {!hasWon && !hasLost ? (
          <div className="flex gap-2">
            <MovieSearchInput
              disabled={isLoading || isSubmitting}
              onSelectMovie={handleMovieGuess}
            />
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center flex flex-col items-center gap-4">
            <Trophy className={`w-12 h-12 ${hasWon ? "text-amber-400" : "text-slate-600"}`} />
            <div>
              <h3 className="text-2xl font-bold">
                {hasWon ? "Movie Solved!" : "Better Luck Tomorrow!"}
              </h3>
              {solution && (
                <p className="text-sm text-slate-400 mt-1">
                  Title: <strong className="text-slate-200">{solution.title} ({solution.year})</strong>
                </p>
              )}
            </div>

            {hasWon && (
              <div className="flex flex-col gap-1 items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800 w-full">
                <span className="text-xs text-slate-400">Final Score</span>
                <span className="text-3xl font-extrabold text-amber-400">
                  {calculateScore(clueNumber)} pts
                </span>
                <span className="text-xs font-semibold text-emerald-400 mt-1">
                  {getRankBadge(clueNumber)}
                </span>
              </div>
            )}

            {!user && hasWon && (
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Sign in with Google to enter Leaderboard</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {hasCopied ? (
                <>
                  <Check className="w-5 h-5 text-white" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Share Result</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* All Unlocked Clues History */}
        {unlockedClues.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unlocked clues ({unlockedClues.length})
            </span>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {unlockedClues.slice(0, -1).reverse().map((c, i) => (
                <div
                  key={i}
                  className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl text-xs text-slate-400 italic"
                >
                  "{c}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Guesses */}
        {attempts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Incorrect guesses ({attempts.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {attempts.map((attempt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-lg text-sm flex items-center justify-between text-slate-400"
                >
                  <span>{attempt}</span>
                  <span className="text-xs text-rose-400/80">Incorrect</span>
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