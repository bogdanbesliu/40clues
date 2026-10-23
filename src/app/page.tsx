"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Trophy,
  Share2,
  Check,
  Flame,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronUp,
  Film,
  HelpCircle,
  FastForward,
  User,
} from "lucide-react";
import Link from "next/link";
import MovieSearchInput from "@/components/MovieSearchInput";
import LeaderboardModal from "@/components/LeaderboardModal";
import HowToPlayModal from "@/components/HowToPlayModal";
import { createBrowserClient } from "@supabase/ssr";
import { getClueBadge } from "@/lib/clueCategories";
import { shuffleArray } from "@/lib/utils";

interface SolutionData {
  title: string;
  year: number;
  poster?: string | null;
}

interface StoredGameProgress {
  gameDate: string;
  clueNumber: number;
  attempts: string[];
  userDeck: string[];
  unlockedClues: string[];
  hasWon: boolean;
  hasLost: boolean;
  solution: SolutionData | null;
}

export default function Home() {
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [totalClues, setTotalClues] = useState<number>(40);
  const [userDeck, setUserDeck] = useState<string[]>([]);
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [gameDate, setGameDate] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  const [user, setUser] = useState<any>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [isClueFading, setIsClueFading] = useState(false);
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const calculateScore = (cluesUsed: number) => {
    return Math.max(25, 1000 - (cluesUsed - 1) * 25);
  };

  const currentPotentialScore = calculateScore(clueNumber);
  const progressPercent = Math.min(100, Math.round((clueNumber / totalClues) * 100));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        checkAndSyncPendingLocalScore(session?.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        checkAndSyncPendingLocalScore(session?.access_token);
      }
    });

    initGame();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasWon) {
      const target = calculateScore(clueNumber);
      let current = 0;
      const step = Math.max(15, Math.ceil(target / 25));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setAnimatedScore(target);
          clearInterval(interval);
        } else {
          setAnimatedScore(current);
        }
      }, 25);
      return () => clearInterval(interval);
    }
  }, [hasWon, clueNumber]);

  const syncScoreToDatabase = async (
    cluesUsed: number,
    score: number,
    targetDate?: string,
    explicitToken?: string
  ) => {
    try {
      let token = explicitToken;
      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        token = session?.access_token;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch("/api/score", {
        method: "POST",
        headers,
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

  const checkAndSyncPendingLocalScore = async (accessToken?: string) => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("40clues_progress_")) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed: StoredGameProgress = JSON.parse(raw);
          const dateFromKey = key.replace("40clues_progress_", "");
          const targetDate = parsed.gameDate || dateFromKey;
          if (parsed.hasWon && targetDate) {
            const score = calculateScore(parsed.clueNumber || 1);
            await syncScoreToDatabase(parsed.clueNumber || 1, score, targetDate, accessToken);
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse saved progress:", err);
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

      const today = data.gameDate || data.game_date || new Date().toISOString().split("T")[0];
      setGameDate(today);
      setTotalClues(data.totalClues || 40);

      const savedStreak = parseInt(localStorage.getItem("40clues_streak") || "0", 10);
      setStreak(savedStreak);

      const savedLocal = localStorage.getItem(`40clues_progress_${today}`);
      if (savedLocal) {
        const parsed: StoredGameProgress = JSON.parse(savedLocal);
        setClueNumber(parsed.clueNumber || 1);
        setAttempts(parsed.attempts || []);
        setUserDeck(parsed.userDeck || []);
        setUnlockedClues(parsed.unlockedClues || []);
        setHasWon(parsed.hasWon || false);
        setHasLost(parsed.hasLost || false);
        setSolution(parsed.solution || null);
      } else {
        const rawClues: string[] = Array.isArray(data.allClues)
          ? data.allClues
          : Array.isArray(data.clues)
            ? data.clues
            : data.clue
              ? [data.clue]
              : [];

        const shuffled = rawClues.length > 1 ? shuffleArray(rawClues) : rawClues;
        const firstClue = shuffled[0] || data.clue || "No clue available.";

        setUserDeck(shuffled);
        setUnlockedClues([firstClue]);
        setClueNumber(1);

        const initialProgress: StoredGameProgress = {
          gameDate: today,
          clueNumber: 1,
          attempts: [],
          userDeck: shuffled,
          unlockedClues: [firstClue],
          hasWon: false,
          hasLost: false,
          solution: null,
        };
        localStorage.setItem(`40clues_progress_${today}`, JSON.stringify(initialProgress));
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

  const saveProgress = (
    nextClueNum: number,
    newAttempts: string[],
    deck: string[],
    newUnlockedClues: string[],
    won: boolean,
    lost: boolean,
    sol: SolutionData | null
  ) => {
    if (!gameDate) return;
    const progress: StoredGameProgress = {
      gameDate,
      clueNumber: nextClueNum,
      attempts: newAttempts,
      userDeck: deck,
      unlockedClues: newUnlockedClues,
      hasWon: won,
      hasLost: lost,
      solution: sol,
    };
    localStorage.setItem(`40clues_progress_${gameDate}`, JSON.stringify(progress));
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

    if (attempts.some((a) => a.toLowerCase() === selectedTitle.toLowerCase())) {
      setMessage("You already guessed that movie! Try another one.");
      triggerErrorShake();
      return;
    }

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
        const sol: SolutionData = {
          title: data.title,
          year: data.year,
          poster: data.poster || null,
        };
        setSolution(sol);
        setMessage("Correct! Brilliant deduction!");
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        updateStreakOnWin();
        const score = calculateScore(clueNumber);
        saveProgress(clueNumber, attempts, userDeck, unlockedClues, true, false, sol);
        await syncScoreToDatabase(clueNumber, score, gameDate);
      } else {
        triggerErrorShake();
        const newAttempts = [selectedTitle, ...attempts];
        setAttempts(newAttempts);

        if (data.gameOver || clueNumber >= totalClues) {
          setHasLost(true);
          const sol = data.solution || null;
          setSolution(sol);
          setMessage(
            sol
              ? `Game over! The movie was: ${sol.title} (${sol.year})`
              : "Game over! You ran out of clues."
          );
          localStorage.setItem("40clues_streak", "0");
          setStreak(0);
          saveProgress(clueNumber, newAttempts, userDeck, unlockedClues, false, true, sol);
        } else {
          setIsClueFading(true);
          setTimeout(() => {
            const nextNum = clueNumber + 1;
            const nextClueText =
              userDeck.length >= nextNum ? userDeck[nextNum - 1] : data.nextClue;
            const newUnlocked = [...unlockedClues, nextClueText];
            setClueNumber(nextNum);
            setUnlockedClues(newUnlocked);
            setIsClueFading(false);
            setMessage("Incorrect! Next clue unlocked.");
            saveProgress(nextNum, newAttempts, userDeck, newUnlocked, false, false, null);
          }, 150);
        }
      }
    } catch {
      setMessage("Error checking answer. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipClue = async () => {
    if (hasWon || hasLost || isLoading || isSubmitting || clueNumber >= totalClues) return;

    setIsClueFading(true);
    setTimeout(async () => {
      const nextNum = clueNumber + 1;
      let nextClueText = userDeck.length >= nextNum ? userDeck[nextNum - 1] : "";

      if (!nextClueText) {
        try {
          const res = await fetch(`/api/game?clue=${nextNum}`);
          const data = await res.json();
          nextClueText = data.clue || "Next clue unlocked.";
        } catch {
          nextClueText = "Next clue unlocked.";
        }
      }

      const newUnlocked = [...unlockedClues, nextClueText];
      setClueNumber(nextNum);
      setUnlockedClues(newUnlocked);
      setIsClueFading(false);
      setMessage("Skipped to next clue (-25 pts).");
      saveProgress(nextNum, attempts, userDeck, newUnlocked, false, false, null);
    }, 150);
  };

  const handleShare = async () => {
    const finalScore = hasWon ? calculateScore(clueNumber) : 0;
    const puzzleDate = gameDate ? gameDate.replace(/-/g, ".") : "Daily";

    let grid = "";
    if (hasWon) {
      const yellowCount = Math.max(0, clueNumber - 1);
      const fullSequence = "🟨".repeat(yellowCount) + "🟩";
      for (let i = 0; i < fullSequence.length; i += 5) {
        grid += fullSequence.slice(i, i + 5) + "\n";
      }
    } else {
      grid = "⬛⬛⬛⬛⬛\n";
    }

    const streakDisplay = streak > 0 ? ` • 🔥 ${streak}-day streak` : "";
    const shareText = `40Clues #${puzzleDate} 🎬\n💡 ${clueNumber}/${totalClues} clues used\n🏆 ${finalScore} pts${streakDisplay}\n\n${grid.trim()}\nhttps://40clues.com`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2500);
      }
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 sm:py-8 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="max-w-xl w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            40Clues
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold mt-0.5">
            Cinema Edition
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {streak > 0 && (
            <div
              className="flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-950/70 border border-orange-800/80 px-2.5 py-1.5 rounded-full shadow-sm"
              title={`${streak}-day win streak`}
            >
              <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" aria-hidden="true" />
              <span>{streak}</span>
            </div>
          )}

          <button
            onClick={() => setIsHowToPlayOpen(true)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all"
            title="How to play"
            aria-label="How to play"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 hover:bg-slate-800 active:scale-95 transition-all"
            title="Open Daily Leaderboard"
            aria-label="Open Daily Leaderboard"
          >
            <Trophy className="w-4 h-4" aria-hidden="true" />
          </button>

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

      {/* Visual Clue Progress Bar */}
      <div className="max-w-xl w-full mb-5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
          <span>
            Clue {clueNumber} of {totalClues}
          </span>
          <span className="text-amber-400">{currentPotentialScore} pts left</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className={`h-full transition-all duration-500 ease-out ${clueNumber <= 10
              ? "bg-gradient-to-r from-emerald-500 to-amber-400"
              : clueNumber <= 25
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-orange-500 to-rose-500"
              }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full flex flex-col gap-5 flex-1">
        {isLoading ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 min-h-[160px] animate-pulse flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-800 rounded w-28" />
              <div className="h-4 bg-slate-800 rounded w-20" />
            </div>
            <div className="space-y-2.5 my-2">
              <div className="h-5 bg-slate-800/90 rounded w-5/6" />
              <div className="h-5 bg-slate-800/90 rounded w-3/4" />
            </div>
            <div className="h-3 bg-slate-800/60 rounded w-24" />
          </div>
        ) : (
          <section
            aria-labelledby="active-clue-heading"
            className="relative overflow-hidden bg-slate-900/95 border border-slate-800/90 hover:border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur min-h-[160px] flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  id="active-clue-heading"
                  className="flex items-center gap-1.5 text-amber-400 font-bold tracking-wide text-xs"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Clue #{clueNumber}
                </span>

                {unlockedClues.length > 0 &&
                  (() => {
                    const currentClueText = unlockedClues[unlockedClues.length - 1];
                    const badge = getClueBadge(currentClueText, clueNumber);
                    return (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${badge.colorClass}`}
                      >
                        <span aria-hidden="true">{badge.emoji}</span>
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
              </div>

              <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-amber-300 font-bold text-xs flex-shrink-0 shadow-inner">
                {currentPotentialScore} pts
              </span>
            </div>

            <p
              aria-live="polite"
              className={`text-base sm:text-xl font-medium text-slate-100 leading-relaxed italic my-auto transition-all duration-200 ${isClueFading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
                }`}
            >
              "{unlockedClues[unlockedClues.length - 1]}"
            </p>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{attempts.length} attempts</span>
              <span className="text-amber-500/80">{totalClues} total clues</span>
            </div>
          </section>
        )}

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3 rounded-xl text-xs sm:text-sm font-semibold text-center transition-all shadow-md ${hasWon
              ? "bg-emerald-950/90 border border-emerald-600/80 text-emerald-200"
              : hasLost
                ? "bg-rose-950/90 border border-rose-600/80 text-rose-200"
                : "bg-slate-900 border border-slate-700 text-slate-200"
              }`}
          >
            {message}
          </div>
        )}

        {!hasWon && !hasLost ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <MovieSearchInput
                disabled={isLoading || isSubmitting}
                isErrorShake={isShakeActive}
                onSelectMovie={handleMovieGuess}
              />
              <button
                type="button"
                onClick={handleSkipClue}
                disabled={isLoading || isSubmitting || clueNumber >= totalClues}
                className="min-h-[48px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/80 rounded-xl text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-40"
                title="Skip to next clue (-25 pts)"
              >
                <FastForward className="w-4 h-4" />
                <span className="hidden sm:inline">Pass (-25 pts)</span>
              </button>
            </div>
          </div>
        ) : (
          <section
            aria-label="Game Result"
            className="bg-slate-900 border border-slate-800/90 p-5 sm:p-7 rounded-2xl text-center flex flex-col items-center gap-4 sm:gap-5 shadow-2xl"
          >
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-1">{hasWon ? "🎉" : "🎬"}</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                {hasWon ? "Cinema Mastermind!" : "Game Over"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {hasWon
                  ? "You successfully deduced today's movie!"
                  : "Better luck on tomorrow's clues!"}
              </p>
            </div>

            {solution && (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 border border-slate-800 p-3.5 sm:p-4 rounded-xl w-full">
                {solution.poster ? (
                  <img
                    src={solution.poster}
                    alt={solution.title}
                    className="w-20 sm:w-24 h-30 sm:h-36 object-cover rounded-lg shadow-lg border border-slate-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 sm:w-24 h-30 sm:h-36 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-700">
                    <Film className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                <div className="text-center sm:text-left flex flex-col justify-center">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                    Target Film
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100">{solution.title}</h3>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    Released in {solution.year}
                  </span>
                </div>
              </div>
            )}

            {hasWon && (
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                    {animatedScore}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Clues Used</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-200 mt-0.5">
                    {clueNumber}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Streak</span>
                  <span className="text-xl sm:text-2xl font-black text-orange-400 mt-0.5">
                    {streak}🔥
                  </span>
                </div>
              </div>
            )}

            {hasWon && (
              <div className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full">
                {getRankBadge(clueNumber)}
              </div>
            )}

            {!user && hasWon && (
              <button
                onClick={handleGoogleLogin}
                className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs active:scale-95 transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Save streak & join Leaderboard with Google</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 focus:outline-none"
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

        {unlockedClues.length > 1 && (
          <div className="flex flex-col border border-slate-800/90 bg-slate-900/40 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              aria-expanded={isHistoryExpanded}
              className="min-h-[44px] w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-900/60 transition-colors"
            >
              <span>Previous Unlocked Clues ({unlockedClues.length - 1})</span>
              {isHistoryExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isHistoryExpanded && (
              <div className="flex flex-col gap-2 p-3 border-t border-slate-800/80">
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

        {attempts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Incorrect guesses ({attempts.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {attempts.map((attempt, idx) => (
                <span
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 flex items-center gap-1.5 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {attempt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-xl w-full border-t border-slate-900/80 mt-12 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <div>© 40Clues 2026. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="hover:text-amber-400 transition-colors underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameDate={gameDate}
      />

      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </main>
  );
}