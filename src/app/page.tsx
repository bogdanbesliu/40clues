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
  Menu,
  Calendar,
  X,
} from "lucide-react";
import Link from "next/link";
import MovieSearchInput from "@/components/MovieSearchInput";
import LeaderboardModal from "@/components/LeaderboardModal";
import HowToPlayModal from "@/components/HowToPlayModal";
import FeedbackModal from "@/components/FeedbackModal";
import NextGameCountdown from "@/components/NextGameCountdown";
import ShareModal from "@/components/ShareModal";
import ArchiveModal from "@/components/ArchiveModal";
import { createBrowserClient } from "@supabase/ssr";
import { getClueBadge } from "@/lib/clueCategories";

interface SolutionData {
  title: string;
  year: number;
  poster?: string | null;
}

interface StoredGameProgress {
  gameDate: string;
  deckSeed: string;
  clueNumber: number;
  scorePenalty: number;
  hasUsedFreePass: boolean;
  attempts: string[];
  unlockedClues: string[];
  remainingClues?: string[];
  unlockedLifelines?: { decade?: string; genre?: string };
  hasWon: boolean;
  hasLost: boolean;
  solution: SolutionData | null;
}

export default function Home() {
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [totalClues, setTotalClues] = useState<number>(40);
  const [deckSeed, setDeckSeed] = useState<string>("");
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [remainingClues, setRemainingClues] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);

  // Score & Pass
  const [scorePenalty, setScorePenalty] = useState<number>(0);
  const [hasUsedFreePass, setHasUsedFreePass] = useState<boolean>(false);
  const [unlockedLifelines, setUnlockedLifelines] = useState<{ decade?: string; genre?: string }>({});
  const [isLifelineLoading, setIsLifelineLoading] = useState<"decade" | "genre" | null>(null);

  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [gameDate, setGameDate] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  const [user, setUser] = useState<any>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRemainingClues, setShowRemainingClues] = useState(false);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [isClueFading, setIsClueFading] = useState(false);
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const currentPotentialScore = Math.max(25, 1000 - scorePenalty);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) checkAndSyncPendingLocalScore(user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) checkAndSyncPendingLocalScore(activeUser.id);
    });

    const searchParams = new URLSearchParams(window.location.search);
    const dateParam = searchParams.get("date") || undefined;
    initGame(dateParam);

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasWon) {
      let current = 0;
      const step = Math.ceil(currentPotentialScore / 35);
      const timer = setInterval(() => {
        current += step;
        if (current >= currentPotentialScore) {
          setAnimatedScore(currentPotentialScore);
          clearInterval(timer);
        } else {
          setAnimatedScore(current);
        }
      }, 20);
      return () => clearInterval(timer);
    }
  }, [hasWon, currentPotentialScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const checkAndSyncPendingLocalScore = async (_userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const savedLocal = localStorage.getItem(`40clues_progress_${today}`);
    if (savedLocal) {
      try {
        const parsed: StoredGameProgress = JSON.parse(savedLocal);
        if (parsed.hasWon && parsed.solution) {
          const score = Math.max(25, 1000 - (parsed.scorePenalty || 0));
          await syncScoreToDatabase(parsed.clueNumber, score, today);
        }
      } catch (err) {
        console.error("Local sync error:", err);
      }
    }
  };

  const initGame = async (dateOverride?: string) => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      let targetDate = dateOverride || new URLSearchParams(window.location.search).get("date") || today;

      // Restrict historical puzzles to authenticated users
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser && targetDate !== today) {
        window.history.replaceState({}, "", "/");
        targetDate = today;
        setMessage("Historical puzzles are members-only. Loaded today's puzzle!");
      }

      const savedStreak = parseInt(localStorage.getItem("40clues_streak") || "0", 10);
      setStreak(savedStreak);

      const savedLocal = localStorage.getItem(`40clues_progress_${targetDate}`);
      if (savedLocal) {
        const parsed: StoredGameProgress = JSON.parse(savedLocal);
        setGameDate(parsed.gameDate || targetDate);
        setDeckSeed(parsed.deckSeed || "");
        setClueNumber(parsed.clueNumber);
        setScorePenalty(parsed.scorePenalty || 0);
        setHasUsedFreePass(parsed.hasUsedFreePass || false);
        setAttempts(parsed.attempts || []);
        setUnlockedClues(parsed.unlockedClues || []);
        setRemainingClues(parsed.remainingClues || []);
        setUnlockedLifelines(parsed.unlockedLifelines || {});
        setHasWon(parsed.hasWon);
        setHasLost(parsed.hasLost);
        setSolution(parsed.solution);
        setIsLoading(false);
        return;
      }

      // Generate a unique random deckSeed for this player (preserving RNG luck)
      const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const queryParam = targetDate ? `?date=${targetDate}&deckSeed=${randomSeed}` : `?deckSeed=${randomSeed}`;
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/game${queryParam}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Could not load puzzle. Check connection.");
        setIsLoading(false);
        return;
      }

      const activeDate = data.gameDate || targetDate;
      setGameDate(activeDate);
      setTotalClues(data.totalClues || 40);
      setDeckSeed(data.deckSeed || randomSeed);
      setUnlockedClues([data.initialClue || "No clue available"]);
      setRemainingClues([]);
      setUnlockedLifelines({});
      setClueNumber(1);
      setAttempts([]);
      setScorePenalty(0);
      setHasUsedFreePass(false);
      setHasWon(false);
      setHasLost(false);
      setSolution(null);

      const initialProgress: StoredGameProgress = {
        gameDate: activeDate,
        deckSeed: data.deckSeed || randomSeed,
        clueNumber: 1,
        scorePenalty: 0,
        hasUsedFreePass: false,
        attempts: [],
        unlockedClues: [data.initialClue || "No clue available"],
        remainingClues: [],
        unlockedLifelines: {},
        hasWon: false,
        hasLost: false,
        solution: null,
      };
      localStorage.setItem(`40clues_progress_${activeDate}`, JSON.stringify(initialProgress));
    } catch (err) {
      setMessage("Network error while loading game.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDate = (selectedDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (!user && selectedDate !== today) {
      setMessage("Sign in with Google to play historical archive puzzles.");
      setIsArchiveOpen(true);
      return;
    }
    if (selectedDate === today) {
      window.history.replaceState({}, "", "/");
    } else {
      window.history.replaceState({}, "", `/?date=${selectedDate}`);
    }
    initGame(selectedDate);
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
      let anonName = localStorage.getItem("40clues_anon_name");
      if (!anonName) {
        anonName = `Cinephile_${Math.floor(1000 + Math.random() * 9000)}`;
        localStorage.setItem("40clues_anon_name", anonName);
      }

      await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameDate: targetDate || gameDate,
          cluesUsed,
          score,
          anonName,
        }),
      });
    } catch (err) {
      console.error("Failed to sync score:", err);
    }
  };

  const saveProgress = (
    nextClueNum: number,
    newPenalty: number,
    usedFreePass: boolean,
    newAttempts: string[],
    newUnlockedClues: string[],
    won: boolean,
    lost: boolean,
    sol: SolutionData | null,
    newRemainingClues?: string[],
    newLifelines?: { decade?: string; genre?: string }
  ) => {
    if (!gameDate) return;
    const progress: StoredGameProgress = {
      gameDate,
      deckSeed,
      clueNumber: nextClueNum,
      scorePenalty: newPenalty,
      hasUsedFreePass: usedFreePass,
      attempts: newAttempts,
      unlockedClues: newUnlockedClues,
      remainingClues: newRemainingClues !== undefined ? newRemainingClues : remainingClues,
      unlockedLifelines: newLifelines !== undefined ? newLifelines : unlockedLifelines,
      hasWon: won,
      hasLost: lost,
      solution: sol,
    };
    localStorage.setItem(`40clues_progress_${gameDate}`, JSON.stringify(progress));
  };

  const getRankBadge = (scoreValue: number) => {
    if (scoreValue >= 950) return "🎯 Cinephile Psychic";
    if (scoreValue >= 800) return "🍿 Film Buff";
    if (scoreValue >= 500) return "🎟️ Casual Viewer";
    if (scoreValue >= 200) return "🕵️ Desperate Detective";
    return "🪢 By the Skin of Your Teeth";
  };

  const updateStreakOnWin = () => {
    const today = new Date().toISOString().split("T")[0];
    if (gameDate && gameDate !== today) return;
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem("40clues_streak", newStreak.toString());
  };

  const triggerErrorShake = () => {
    setIsShakeActive(true);
    setTimeout(() => setIsShakeActive(false), 500);
  };

  const handleSkipClue = async () => {
    if (hasWon || hasLost || isSubmitting || clueNumber >= totalClues) return;
    const nextNum = clueNumber + 1;

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/game", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "pass",
          deckSeed,
          clueNumber: nextNum,
          gameDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.clue) {
        setMessage(data.error || "Failed to retrieve next clue. Try again.");
        return;
      }

      const nextClueText = data.clue;
      const penaltyToAdd = hasUsedFreePass ? 10 : 0;
      const newPenalty = scorePenalty + penaltyToAdd;
      const toastMsg = hasUsedFreePass
        ? "Clue passed (-10 pts)"
        : "Free Pass used! (0 pts deducted)";

      setIsClueFading(true);
      setTimeout(() => {
        const newUnlocked = [...unlockedClues, nextClueText];
        setClueNumber(nextNum);
        setScorePenalty(newPenalty);
        if (!hasUsedFreePass) setHasUsedFreePass(true);
        setUnlockedClues(newUnlocked);
        setIsClueFading(false);
        setMessage(toastMsg);
        saveProgress(nextNum, newPenalty, true, attempts, newUnlocked, false, false, null);
      }, 150);
    } catch {
      setMessage("Network error passing clue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseLifeline = async (type: "decade" | "genre") => {
    if (hasWon || hasLost || isLifelineLoading || unlockedLifelines[type]) return;
    setIsLifelineLoading(type);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/game/lifeline", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, gameDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to unlock tactical hint.");
        return;
      }

      const newPenalty = scorePenalty + 50;
      const newLifelines = {
        ...unlockedLifelines,
        [type]: type === "decade" ? data.decade : data.genre,
      };

      setScorePenalty(newPenalty);
      setUnlockedLifelines(newLifelines);
      setMessage(`Tactical hint unlocked (-50 pts): ${data.hint}`);
      saveProgress(
        clueNumber,
        newPenalty,
        hasUsedFreePass,
        attempts,
        unlockedClues,
        false,
        false,
        null,
        remainingClues,
        newLifelines
      );
    } catch {
      setMessage("Network error unlocking tactical hint.");
    } finally {
      setIsLifelineLoading(null);
    }
  };

  const handleMovieGuess = async (selectedTitle: string) => {
    if (!selectedTitle || hasWon || hasLost || isSubmitting) return;
    if (attempts.some((a) => a.toLowerCase() === selectedTitle.toLowerCase())) {
      setMessage(`You already tried "${selectedTitle}"! Pick another film.`);
      triggerErrorShake();
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/guess", {
        method: "POST",
        headers,
        body: JSON.stringify({ guess: selectedTitle, clueNumber, gameDate, deckSeed }),
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
        const rest = data.remainingClues || [];
        setRemainingClues(rest);
        setMessage("Spot on! Brilliant deduction!");
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
        updateStreakOnWin();
        saveProgress(clueNumber, scorePenalty, hasUsedFreePass, attempts, unlockedClues, true, false, sol, rest);
        syncScoreToDatabase(clueNumber, currentPotentialScore);
      } else {
        triggerErrorShake();
        const newAttempts = [selectedTitle, ...attempts];
        setAttempts(newAttempts);

        if (data.gameOver || clueNumber >= totalClues) {
          setHasLost(true);
          const finalSol: SolutionData = {
            title: data.solution?.title || "",
            year: data.solution?.year || 0,
            poster: data.solution?.poster || null,
          };
          setSolution(finalSol);
          const rest = data.remainingClues || [];
          setRemainingClues(rest);
          setMessage(`Game over! The movie was: ${finalSol.title} (${finalSol.year})`);
          const today = new Date().toISOString().split("T")[0];
          if (gameDate === today) {
            localStorage.setItem("40clues_streak", "0");
            setStreak(0);
          }
          saveProgress(clueNumber, scorePenalty, hasUsedFreePass, newAttempts, unlockedClues, false, true, finalSol, rest);
        } else {
          setIsClueFading(true);
          const newPenalty = scorePenalty + 25;
          setTimeout(() => {
            const nextNum = clueNumber + 1;
            const nextClueText = data.nextClue || "Clue unavailable";
            const newUnlocked = [...unlockedClues, nextClueText];
            setClueNumber(nextNum);
            setScorePenalty(newPenalty);
            setUnlockedClues(newUnlocked);
            setIsClueFading(false);
            setMessage("Incorrect! Next clue unlocked (-25 pts).");
            saveProgress(nextNum, newPenalty, hasUsedFreePass, newAttempts, newUnlocked, false, false, null);
          }, 150);
        }
      }
    } catch (err) {
      setMessage("Error checking answer. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((clueNumber / totalClues) * 100));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 sm:py-8 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="max-w-xl w-full flex items-center justify-between border-b border-slate-800/80 pb-4 mb-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            40Clues
          </h1>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
            Cinema Edition
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-950/70 border border-orange-800/80 px-2.5 py-1.5 rounded-full shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
              <span>{streak}</span>
            </div>
          )}

          <button
            onClick={() => setIsHowToPlayOpen(true)}
            className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            {streak === 0 && unlockedClues.length <= 1 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Leaderboards"
            aria-label="Leaderboards"
          >
            <Trophy className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Desktop Only: Puzzle Archive & User Profile / Sign In */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setIsArchiveOpen(true)}
              className="min-h-[38px] px-3 flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="Puzzle Archive"
              aria-label="Puzzle Archive"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Archive</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all shadow-sm group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  title="My Profile"
                  aria-label={`My Profile (${user.user_metadata?.full_name || user.email || "User"})`}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      aria-hidden="true"
                      className="w-6 h-6 rounded-full border border-amber-400/80 object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs" aria-hidden="true">
                      {(user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-amber-300">
                    Profile
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-400 active:scale-95 rounded-lg border border-slate-800 transition-all p-1.5 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="min-h-[38px] flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <User className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Only: Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Open Menu"
            aria-label="Open Navigation Menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-slate-900 border-l border-slate-800 w-full max-w-xs h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                    40Clues
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    Cinema Edition
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* User Card / Sign In in Mobile Menu */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt=""
                          aria-hidden="true"
                          className="w-10 h-10 rounded-full border border-amber-400/80 object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm"
                          aria-hidden="true"
                        >
                          {(user.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {user.user_metadata?.full_name || user.email?.split("@")[0] || "Detective"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <User className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>Profile & Stats</span>
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                        className="py-2 px-3 bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        aria-label="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <User className="w-4 h-4 text-amber-400" aria-hidden="true" />
                      <span>Guest Player</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sign in to unlock past archive puzzles, save scores, and earn detective badges!
                    </p>
                    <button
                      onClick={() => {
                        handleGoogleLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full min-h-[42px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <LogIn className="w-4 h-4" aria-hidden="true" />
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation list in Mobile Menu */}
              <nav aria-label="Menu navigation" className="flex flex-col gap-2">
                {/* Puzzle Archive with clear text */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsArchiveOpen(true);
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                        Puzzle Archive
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {user ? "Play past cinema mysteries" : "Members only • Past puzzles"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-amber-400" aria-hidden="true">
                    →
                  </span>
                </button>

                {/* Leaderboards */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLeaderboardOpen(true);
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/70 hover:border-amber-500/40 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                      <Trophy className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                        Leaderboards
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Daily and all-time rankings
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-amber-400" aria-hidden="true">
                    →
                  </span>
                </button>

                {/* How to Play */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsHowToPlayOpen(true);
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/70 hover:border-amber-500/40 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:text-amber-400 transition-colors">
                      <HelpCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                        How to Play
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Rules, hints & scoring
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-amber-400" aria-hidden="true">
                    →
                  </span>
                </button>
              </nav>
            </div>

            {/* Drawer Footer Links */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsFeedbackOpen(true);
                }}
                className="hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Feedback
              </button>
              <Link
                href="/privacy"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-amber-400 transition-colors underline underline-offset-2"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Historical Archive Puzzle Banner */}
      {gameDate && gameDate !== new Date().toISOString().split("T")[0] && (
        <aside
          aria-label="Historical puzzle notice"
          className="max-w-xl w-full mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs shadow-sm"
        >
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Archive Puzzle ({gameDate})</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectDate(new Date().toISOString().split("T")[0])}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all text-[11px] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Play Today's Puzzle
          </button>
        </aside>
      )}

      {/* Visual Clue Progress Bar */}
      <div className="max-w-xl w-full mb-5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
          <span>
            Clue {clueNumber} of {totalClues}
          </span>
          <span className="text-amber-400">{currentPotentialScore} pts left</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clueNumber}
          aria-valuemin={1}
          aria-valuemax={totalClues}
          aria-label="Clue progression"
          className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80"
        >
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

      <div className="max-w-xl w-full flex flex-col gap-5">
        {/* Active Clue Card / Skeleton Screen */}
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
            <h2 id="active-clue-heading" className="sr-only">
              Current Clue #{clueNumber}
            </h2>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold tracking-wide text-xs">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Clue #{clueNumber}
                </span>
                {unlockedClues.length > 0 &&
                  (() => {
                    const badge = getClueBadge(
                      unlockedClues[unlockedClues.length - 1],
                      clueNumber
                    );
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
              <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-md text-amber-300 font-bold text-xs shadow-inner">
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
            <div className="mt-3 text-[11px] text-slate-300 flex items-center justify-between">
              <span>{attempts.length} attempts</span>
              <span className="text-amber-400 font-semibold">40 total clues</span>
            </div>
          </section>
        )}

        {/* Live Status Toast */}
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

        {/* Tactical Lifelines & Input Row */}
        {!hasWon && !hasLost ? (
          <div className="flex flex-col gap-2.5">
            {/* Tactical Lifelines */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Tactical Intel (-50 pts):
              </span>
              <div className="flex items-center gap-2">
                {/* Release Decade */}
                {unlockedLifelines.decade ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold px-2.5 py-1 rounded-lg text-xs shadow-sm">
                    📅 {unlockedLifelines.decade}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUseLifeline("decade")}
                    disabled={isLoading || isSubmitting || isLifelineLoading !== null}
                    aria-label="Unlock Release Decade hint (-50 points)"
                    title="Reveal release decade (-50 pts penalty)"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-all font-medium text-xs disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {isLifelineLoading === "decade" ? (
                      <span className="animate-spin text-amber-400">⏳</span>
                    ) : (
                      <span>📅 Decade</span>
                    )}
                  </button>
                )}

                {/* Primary Genre */}
                {unlockedLifelines.genre ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold px-2.5 py-1 rounded-lg text-xs shadow-sm">
                    🎭 {unlockedLifelines.genre}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUseLifeline("genre")}
                    disabled={isLoading || isSubmitting || isLifelineLoading !== null}
                    aria-label="Unlock Primary Genre hint (-50 points)"
                    title="Reveal primary genre (-50 pts penalty)"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-all font-medium text-xs disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {isLifelineLoading === "genre" ? (
                      <span className="animate-spin text-amber-400">⏳</span>
                    ) : (
                      <span>🎭 Genre</span>
                    )}
                  </button>
                )}
              </div>
            </div>

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
                aria-label={
                  hasUsedFreePass
                    ? "Pass clue, deduct 10 points"
                    : "Use Free Pass to skip clue without penalty"
                }
                title={
                  hasUsedFreePass
                    ? "Pass clue (-10 pts)"
                    : "Free Pass (0 pts deducted)"
                }
                className="min-h-[48px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/80 rounded-xl text-slate-200 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <FastForward className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {hasUsedFreePass ? "Pass (-10)" : "Free Pass"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <section className="bg-slate-900 border border-slate-800/90 p-5 sm:p-7 rounded-2xl text-center flex flex-col items-center gap-4 sm:gap-5 shadow-2xl">
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
                    <Film className="w-8 h-8 text-slate-400" aria-hidden="true" />
                  </div>
                )}
                <div className="text-center sm:text-left flex flex-col justify-center">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                    Target Film
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                    {solution.title}
                  </h3>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    Released in {solution.year}
                  </span>
                </div>
              </div>
            )}

            {hasWon && (
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Score
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                    {animatedScore}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Clues Used
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-200 mt-0.5">
                    {clueNumber}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Streak
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-orange-400 mt-0.5">
                    {streak}🔥
                  </span>
                </div>
              </div>
            )}

            {hasWon && (
              <div className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full">
                {getRankBadge(currentPotentialScore)}
              </div>
            )}

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
              <span>Share Result</span>
            </button>

            {/* Live countdown timer until next mystery movie */}
            <NextGameCountdown onRefresh={initGame} />

            {/* View unrevealed clues */}
            <button
              id="toggle-remaining-clues"
              onClick={() => setShowRemainingClues(!showRemainingClues)}
              aria-expanded={showRemainingClues}
              aria-controls="remaining-clues-list"
              className="text-xs font-medium text-slate-300 hover:text-slate-100 underline underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              {showRemainingClues
                ? "Hide remaining clues"
                : "Curious? View all remaining clues"}
            </button>

            {showRemainingClues && remainingClues.length > 0 && (
              <div
                id="remaining-clues-list"
                role="region"
                aria-labelledby="toggle-remaining-clues"
                className="mt-2 max-h-40 overflow-y-auto text-left space-y-2 p-3 bg-slate-950/50 border border-slate-800 rounded-xl w-full"
              >
                {remainingClues.map((clue, idx) => (
                  <p key={idx} className="text-xs text-slate-300">
                    <span className="text-amber-400 font-bold mr-2">
                      #{clueNumber + idx + 1}
                    </span>
                    {clue}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Collapsible Unlocked Clues History */}
        {unlockedClues.length > 1 && (
          <div className="flex flex-col border border-slate-800/90 bg-slate-900/40 rounded-xl overflow-hidden">
            <button
              id="toggle-previous-clues"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              aria-expanded={isHistoryExpanded}
              aria-controls="previous-clues-list"
              className="min-h-[44px] w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-slate-100 hover:bg-slate-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span>Previous Unlocked Clues ({unlockedClues.length - 1})</span>
              {isHistoryExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            {isHistoryExpanded && (
              <div
                id="previous-clues-list"
                role="region"
                aria-labelledby="toggle-previous-clues"
                className="flex flex-col gap-2 p-3 border-t border-slate-800/80"
              >
                {unlockedClues
                  .slice(0, -1)
                  .reverse()
                  .map((c, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg text-xs text-slate-200 italic leading-relaxed"
                    >
                      "{c}"
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Incorrect Guesses (Pill format) */}
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
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                  {attempt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-xl w-full border-t border-slate-900/80 mt-12 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div>© 40Clues 2026. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link
            href="/archive"
            className="hover:text-amber-400 transition-colors underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Archive
          </Link>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="hover:text-amber-400 transition-colors underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Give Feedback
          </button>
          <Link
            href="/privacy"
            className="hover:text-amber-400 transition-colors underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>

      {/* Modals */}
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onSelectDate={handleSelectDate}
        currentGameDate={gameDate}
        isLoggedIn={!!user}
        onLogin={handleGoogleLogin}
      />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameDate={gameDate}
      />
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
        isLoggedIn={!!user}
        onLogin={handleGoogleLogin}
      />
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        userId={user?.id}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        score={currentPotentialScore}
        clueNumber={clueNumber}
        totalClues={totalClues}
        streak={streak}
        rankBadge={getRankBadge(currentPotentialScore)}
        movieTitle={solution?.title || "Mystery Movie"}
        movieYear={solution?.year || ""}
        hasWon={hasWon}
        gameDate={gameDate}
      />
    </main>
  );
}