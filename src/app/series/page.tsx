"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Tv,
  HelpCircle,
  FastForward,
  User,
  Menu,
  Calendar,
  X,
  Flag,
  Film,
  Layers,
} from "lucide-react";
import Link from "next/link";
import SeriesSearchInput from "@/components/SeriesSearchInput";
import SeriesLeaderboardModal from "@/components/SeriesLeaderboardModal";
import SeriesHowToPlayModal from "@/components/SeriesHowToPlayModal";
import FeedbackModal from "@/components/FeedbackModal";
import NextGameCountdown from "@/components/NextGameCountdown";
import SeriesShareModal from "@/components/SeriesShareModal";
import GuestNameModal from "@/components/GuestNameModal";
import SeriesGiveUpModal from "@/components/SeriesGiveUpModal";
import { createBrowserClient } from "@supabase/ssr";
import { getClueBadge } from "@/lib/clueCategories";
import { normalizeMovieTitle } from "@/lib/utils";

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
  unlockedLifelines?: { seasons?: string; genre?: string };
  hasWon: boolean;
  hasLost: boolean;
  hasGivenUp?: boolean;
  solution: SolutionData | null;
}

export default function SeriesHome() {
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [totalClues, setTotalClues] = useState<number>(40);
  const [deckSeed, setDeckSeed] = useState<string>("");
  const [unlockedClues, setUnlockedClues] = useState<string[]>([]);
  const [remainingClues, setRemainingClues] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);

  // Score & Pass
  const [scorePenalty, setScorePenalty] = useState<number>(0);
  const [hasUsedFreePass, setHasUsedFreePass] = useState<boolean>(false);
  const [unlockedLifelines, setUnlockedLifelines] = useState<{ seasons?: string; genre?: string }>({});
  const [isLifelineLoading, setIsLifelineLoading] = useState<"seasons" | "genre" | null>(null);

  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [hasGivenUp, setHasGivenUp] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [gameDate, setGameDate] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  const [user, setUser] = useState<any>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [hasSeenHowToPlay, setHasSeenHowToPlay] = useState<boolean>(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [isGuestNameModalOpen, setIsGuestNameModalOpen] = useState(false);
  const [pendingWinData, setPendingWinData] = useState<{
    cluesUsed: number;
    score: number;
    gameDate: string;
  } | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRemainingClues, setShowRemainingClues] = useState(false);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [animatedScore, setAnimatedScore] = useState<number>(1000);

  const cardRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const howToPlayTriggerRef = useRef<HTMLButtonElement>(null);
  const leaderboardTriggerRef = useRef<HTMLButtonElement>(null);
  const giveUpTriggerRef = useRef<HTMLButtonElement>(null);
  const guestNameTriggerRef = useRef<HTMLButtonElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Score calculation: 1000 base - penalties, floor at 25
  const currentPotentialScore = Math.max(25, 1000 - scorePenalty);

  // Close mobile dropdown on Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        hamburgerBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Animated score ticker on victory
  useEffect(() => {
    if (hasWon) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        setAnimatedScore(currentPotentialScore);
        return;
      }

      let current = 0;
      const step = Math.max(1, Math.floor(currentPotentialScore / 40));
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

  // Load streak from localStorage
  useEffect(() => {
    const savedStreak = localStorage.getItem("40clues_tv_streak");
    if (savedStreak) {
      setStreak(parseInt(savedStreak, 10));
    }
  }, []);

  // Main game initialization
  const initGame = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const today = new Date().toISOString().split("T")[0];
      const savedProgress = localStorage.getItem(`40clues_tv_progress_${today}`);

      if (savedProgress) {
        const parsed: StoredGameProgress = JSON.parse(savedProgress);
        if (parsed.gameDate === today) {
          setGameDate(parsed.gameDate);
          setDeckSeed(parsed.deckSeed);
          setClueNumber(parsed.clueNumber);
          setScorePenalty(parsed.scorePenalty);
          setHasUsedFreePass(parsed.hasUsedFreePass);
          setAttempts(parsed.attempts || []);
          setUnlockedClues(parsed.unlockedClues || []);
          setRemainingClues(parsed.remainingClues || []);
          setUnlockedLifelines(parsed.unlockedLifelines || {});
          setHasWon(parsed.hasWon);
          setHasLost(parsed.hasLost);
          setHasGivenUp(parsed.hasGivenUp || false);
          setSolution(parsed.solution);
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh game state
      const seed = Math.random().toString(36).substring(2, 10);
      const res = await fetch(`/api/series/game?deckSeed=${seed}`);

      if (!res.ok) {
        throw new Error("Failed to load today's TV series game");
      }

      const data = await res.json();
      setGameDate(data.gameDate);
      setTotalClues(data.totalClues || 40);
      setDeckSeed(data.deckSeed);
      setClueNumber(1);
      setScorePenalty(0);
      setHasUsedFreePass(false);
      setUnlockedLifelines({});
      setAttempts([]);
      setUnlockedClues([data.initialClue]);
      setRemainingClues([]);
      setHasWon(false);
      setHasLost(false);
      setHasGivenUp(false);
      setSolution(null);
    } catch (err: any) {
      console.error("Failed to initialize TV series game:", err);
      setMessage("Could not load today's TV series puzzle. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  // How to play first-time prompt
  useEffect(() => {
    const hasSeen = localStorage.getItem("40clues_tv_has_seen_how_to_play");
    if (!hasSeen) {
      setHasSeenHowToPlay(false);
      setIsHowToPlayOpen(true);
      localStorage.setItem("40clues_tv_has_seen_how_to_play", "true");
    }
  }, []);

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
    newLifelines?: { seasons?: string; genre?: string },
    givenUp?: boolean
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
      hasGivenUp: givenUp !== undefined ? givenUp : hasGivenUp,
      solution: sol,
    };
    localStorage.setItem(`40clues_tv_progress_${gameDate}`, JSON.stringify(progress));
  };

  const getRankBadge = (scoreValue: number) => {
    if (scoreValue >= 950) return "🎯 Binge Psychic";
    if (scoreValue >= 800) return "📺 TV Buff";
    if (scoreValue >= 500) return "🛋️ Casual Streamer";
    if (scoreValue >= 200) return "🕵️ TV Detective";
    return "🪢 Skin of Your Teeth";
  };

  const updateStreakOnPlay = () => {
    const today = new Date().toISOString().split("T")[0];
    if (gameDate && gameDate !== today) return streak;
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem("40clues_tv_streak", newStreak.toString());
    return newStreak;
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

      const res = await fetch("/api/series/game", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "pass",
          deckSeed,
          clueNumber: nextNum,
          gameDate,
        }),
      });

      if (!res.ok) {
        setMessage("Could not fetch the next clue. Try again.");
        return;
      }

      const data = await res.json();
      const newUnlocked = [...unlockedClues, data.clue];

      // Passing penalty: 0 if first pass, 10 for subsequent
      let newPenalty = scorePenalty;
      let penaltyCost = 0;
      if (hasUsedFreePass) {
        newPenalty += 10;
        penaltyCost = 10;
      }
      setScorePenalty(newPenalty);
      setHasUsedFreePass(true);

      if (cardRef.current) {
        cardRef.current.classList.add("scale-95", "opacity-50");
      }

      setTimeout(() => {
        setClueNumber(nextNum);
        setUnlockedClues(newUnlocked);
        if (cardRef.current) {
          cardRef.current.classList.remove("scale-95", "opacity-50");
        }
        setMessage(
          penaltyCost > 0
            ? `Passed clue #${clueNumber} (-${penaltyCost} pts). Clue #${nextNum} revealed.`
            : `Used free pass on clue #${clueNumber}! Clue #${nextNum} revealed.`
        );
        saveProgress(nextNum, newPenalty, true, attempts, newUnlocked, false, false, null);
      }, 150);
    } catch {
      setMessage("Network error passing clue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseLifeline = async (type: "seasons" | "genre") => {
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

      const res = await fetch("/api/series/lifeline", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, gameDate }),
      });

      if (!res.ok) {
        setMessage("Failed to unlock tactical hint.");
        return;
      }

      const data = await res.json();
      const newLifelines = {
        ...unlockedLifelines,
        [type]: data.hint,
      };
      const newPenalty = scorePenalty + 50;

      setUnlockedLifelines(newLifelines);
      setScorePenalty(newPenalty);
      setMessage(`Unlocked tactical intel: ${data.hint} (-50 pts).`);

      saveProgress(
        clueNumber,
        newPenalty,
        hasUsedFreePass,
        attempts,
        unlockedClues,
        false,
        false,
        null,
        undefined,
        newLifelines
      );
    } catch {
      setMessage("Network error unlocking tactical hint.");
    } finally {
      setIsLifelineLoading(null);
    }
  };

  const handleGiveUpConfirm = async () => {
    if (hasWon || hasLost || isSubmitting) return;
    setIsSubmitting(true);
    setIsGiveUpModalOpen(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/series/game", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "give_up",
          deckSeed,
          clueNumber,
          gameDate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setMessage(errorData.error || "Failed to surrender.");
        return;
      }

      const data = await res.json();
      const sol: SolutionData = {
        title: data.solution.title,
        year: data.solution.year,
        poster: data.solution.poster,
      };

      setSolution(sol);
      setRemainingClues(data.remainingClues || []);
      setHasGivenUp(true);

      const activeStreak = updateStreakOnPlay();

      if (user) {
        fetch("/api/series/score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            gameDate,
            cluesUsed: clueNumber,
            score: 0,
            anonName: null,
          }),
        }).catch((err) => console.error("TV surrender score sync failed:", err));
      }

      saveProgress(
        clueNumber,
        scorePenalty,
        hasUsedFreePass,
        attempts,
        unlockedClues,
        false,
        false,
        sol,
        data.remainingClues || [],
        unlockedLifelines,
        true
      );
    } catch {
      setMessage("Network error while submitting surrender.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeriesGuess = async (selectedTitle: string) => {
    if (!selectedTitle || hasWon || hasLost || isSubmitting) return;
    if (attempts.some((a) => normalizeMovieTitle(a) === normalizeMovieTitle(selectedTitle))) {
      setMessage(`You already tried "${selectedTitle}"! Pick another TV show.`);
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

      const res = await fetch("/api/series/guess", {
        method: "POST",
        headers,
        body: JSON.stringify({
          guess: selectedTitle,
          clueNumber,
          gameDate,
          deckSeed,
        }),
      });

      const data = await res.json();

      if (data.correct) {
        const wonScore = Math.max(25, 1000 - scorePenalty);
        const sol: SolutionData = {
          title: data.title,
          year: data.year,
          poster: data.poster,
        };

        setHasWon(true);
        setSolution(sol);
        setRemainingClues(data.remainingClues || []);
        setMessage(`Spot on! Today's secret TV show was "${data.title}"!`);

        const prefersReducedMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }

        const activeStreak = updateStreakOnPlay();

        // Record score to Supabase
        if (user) {
          try {
            await fetch("/api/series/score", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                gameDate,
                cluesUsed: clueNumber,
                score: wonScore,
                anonName: null,
              }),
            });
          } catch (e) {
            console.error("TV Score sync failed:", e);
          }
        } else {
          setPendingWinData({
            cluesUsed: clueNumber,
            score: wonScore,
            gameDate,
          });
          setIsGuestNameModalOpen(true);
        }

        saveProgress(
          clueNumber,
          scorePenalty,
          hasUsedFreePass,
          [...attempts, selectedTitle],
          unlockedClues,
          true,
          false,
          sol,
          data.remainingClues || [],
          unlockedLifelines
        );
      } else {
        // Incorrect guess: -25 points
        const newAttempts = [...attempts, selectedTitle];
        const newPenalty = scorePenalty + 25;
        setAttempts(newAttempts);
        setScorePenalty(newPenalty);
        setMessage(`"${selectedTitle}" is incorrect (-25 pts). Keep sleuthing!`);
        triggerErrorShake();

        if (data.gameOver) {
          setHasLost(true);
          const sol: SolutionData = {
            title: data.title,
            year: data.year,
            poster: data.poster,
          };
          setSolution(sol);
          setRemainingClues([]);
          saveProgress(
            clueNumber,
            newPenalty,
            hasUsedFreePass,
            newAttempts,
            unlockedClues,
            false,
            true,
            sol,
            [],
            unlockedLifelines
          );
        } else {
          saveProgress(
            clueNumber,
            newPenalty,
            hasUsedFreePass,
            newAttempts,
            unlockedClues,
            false,
            false,
            null,
            undefined,
            unlockedLifelines
          );
        }
      }
    } catch {
      setMessage("Network error verifying your guess.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSubmitName = async (chosenName: string) => {
    if (!pendingWinData) return;
    try {
      localStorage.setItem("40clues_anon_name", chosenName);
      await fetch("/api/series/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameDate: pendingWinData.gameDate,
          cluesUsed: pendingWinData.cluesUsed,
          score: pendingWinData.score,
          anonName: chosenName,
        }),
      });
      setIsGuestNameModalOpen(false);
      setIsLeaderboardOpen(true);
    } catch (err) {
      console.error("Guest TV name submit error:", err);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/series`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsMobileMenuOpen(false);
  };

  const currentClueText = unlockedClues[clueNumber - 1] || "Decoding clue...";
  const clueBadge = getClueBadge(currentClueText, clueNumber);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 antialiased">
      {/* Live accessibility announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message ? `${message}. ` : ""}{unlockedClues.length > 0 ? `Clue ${clueNumber} of ${totalClues}: ${unlockedClues[clueNumber - 1] || ""}` : ""}
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/series"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950 font-black">
                <Tv className="w-5 h-5 text-slate-950" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-amber-400 bg-clip-text text-transparent">
                  40Clues
                </span>
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase -mt-1">
                  TV Series Edition
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {streak > 0 && (
              <div
                className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold text-amber-400"
                title={`${streak}-day active streak`}
              >
                <Flame className="w-3.5 h-3.5 fill-amber-400" aria-hidden="true" />
                <span>{streak}</span>
              </div>
            )}

            <button
              ref={howToPlayTriggerRef}
              onClick={() => setIsHowToPlayOpen(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold"
              aria-label="How to play instructions"
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Rules</span>
            </button>

            <button
              ref={leaderboardTriggerRef}
              onClick={() => setIsLeaderboardOpen(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold"
              aria-label="View TV leaderboards"
            >
              <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="hidden sm:inline">Rankings</span>
            </button>

            {/* Desktop link to Cinema Edition */}
            <Link
              href="/"
              className="hidden sm:flex min-h-[38px] px-3 items-center gap-1.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 active:scale-95 transition-all text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="Play 40 Clues: Cinema Edition"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Cinema Edition</span>
            </Link>

            {user ? (
              <div className="relative">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-h-[44px]"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold truncate max-w-[90px]">
                    {user.user_metadata?.full_name?.split(" ")[0] || "Profile"}
                  </span>
                </Link>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Mobile hamburger menu */}
            <button
              ref={hamburgerBtnRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl sm:hidden min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
            {/* 40 Clues: Cinema Edition Link */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/30 hover:border-amber-400 flex items-center justify-between transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                  <Film className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-200 group-hover:text-white transition-colors block">
                    40 Clues: Cinema Edition
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Guess today&apos;s mystery film
                  </span>
                </div>
              </div>
              <span className="text-xs text-amber-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                →
              </span>
            </Link>

            <button
              onClick={() => {
                setIsHowToPlayOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 flex items-center gap-2.5 text-xs font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>How to Play</span>
            </button>
            <button
              onClick={() => {
                setIsLeaderboardOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 flex items-center gap-2.5 text-xs font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>TV Leaderboard</span>
            </button>
            <button
              onClick={() => {
                setIsFeedbackOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 flex items-center gap-2.5 text-xs font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              <span>Send Feedback</span>
            </button>

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-slate-200 hover:bg-slate-900 flex items-center gap-2.5 text-xs font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
                >
                  <User className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/30 flex items-center gap-2.5 text-xs font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2.5 text-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Game Arena */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
            <Tv className="w-10 h-10 animate-bounce text-sky-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-300">Tuning into today&apos;s mystery series...</p>
          </div>
        ) : !hasWon && !hasLost && !hasGivenUp ? (
          <>
            {/* Clue Card */}
            <section
              ref={cardRef}
              aria-label={`Clue number ${clueNumber} of ${totalClues}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 shadow-2xl relative transition-all duration-200"
            >
              {/* Clue Header: Badge & Counter */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${clueBadge.colorClass}`}
                >
                  <span aria-hidden="true">{clueBadge.emoji}</span>
                  <span>{clueBadge.label}</span>
                </span>

                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400">
                  <span className="text-amber-400 font-black">Clue #{clueNumber}</span>
                  <span>/</span>
                  <span>{totalClues}</span>
                </div>
              </div>

              {/* Clue Text */}
              <div className="py-2 sm:py-4">
                <p className="text-lg sm:text-2xl font-bold leading-relaxed text-slate-100 min-h-[90px] flex items-center">
                  &ldquo;{currentClueText}&rdquo;
                </p>
              </div>

              {/* Clue Footer: Potential Score & Skip Button */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Current Score
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400">
                    {currentPotentialScore} <span className="text-xs font-bold text-slate-400">pts</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {clueNumber >= 10 && (
                    <button
                      ref={giveUpTriggerRef}
                      onClick={() => setIsGiveUpModalOpen(true)}
                      disabled={isSubmitting}
                      className="min-h-[44px] px-3 py-2 bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      aria-label="Give up and reveal secret TV show"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                      <span className="hidden sm:inline">Give Up</span>
                    </button>
                  )}

                  <button
                    onClick={handleSkipClue}
                    disabled={isSubmitting || clueNumber >= totalClues}
                    className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label={`Pass clue #${clueNumber} ${
                      hasUsedFreePass ? "for a 10 point penalty" : "(Free pass)"
                    }`}
                  >
                    <span>Pass Clue</span>
                    <FastForward className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                      {hasUsedFreePass ? "(-10 pts)" : "(Free)"}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* Tactical Lifelines */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleUseLifeline("genre")}
                disabled={Boolean(unlockedLifelines.genre) || isLifelineLoading === "genre"}
                className={`p-3 rounded-xl border text-xs font-bold text-left flex flex-col gap-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  unlockedLifelines.genre
                    ? "bg-slate-900 border-emerald-800/60 text-emerald-300"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Hint 1: Genre
                  </span>
                  <span className="text-[10px] font-bold text-rose-400">
                    {unlockedLifelines.genre ? "Unlocked" : "-50 pts"}
                  </span>
                </div>
                <span className="text-sm font-semibold truncate text-slate-100">
                  {unlockedLifelines.genre || "Unlock Primary Genre"}
                </span>
              </button>

              <button
                onClick={() => handleUseLifeline("seasons")}
                disabled={Boolean(unlockedLifelines.seasons) || isLifelineLoading === "seasons"}
                className={`p-3 rounded-xl border text-xs font-bold text-left flex flex-col gap-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  unlockedLifelines.seasons
                    ? "bg-slate-900 border-emerald-800/60 text-emerald-300"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Hint 2: Seasons
                  </span>
                  <span className="text-[10px] font-bold text-rose-400">
                    {unlockedLifelines.seasons ? "Unlocked" : "-50 pts"}
                  </span>
                </div>
                <span className="text-sm font-semibold truncate text-slate-100">
                  {unlockedLifelines.seasons || "Unlock Number of Seasons"}
                </span>
              </button>
            </div>

            {/* TV Search Guess Input */}
            <section aria-label="Submit TV series guess" className="w-full">
              <SeriesSearchInput
                onSelectSeries={handleSeriesGuess}
                disabled={isSubmitting}
                isErrorShake={isShakeActive}
              />
            </section>

            {/* Notification message banner */}
            {message && (
              <div
                aria-hidden="true"
                className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-center text-xs font-semibold text-amber-300 shadow-md animate-in fade-in duration-200"
              >
                {message}
              </div>
            )}

            {/* Previous Attempts Chips */}
            {attempts.length > 0 && (
              <section aria-label="Previous incorrect guesses" className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Previous Guesses ({attempts.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {attempts.map((title, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-slate-900 border border-slate-800/90 text-rose-300 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 line-through decoration-rose-500/60"
                    >
                      <X className="w-3 h-3 text-rose-400 flex-shrink-0" aria-hidden="true" />
                      <span>{title}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* History of Unlocked Clues */}
            {unlockedClues.length > 1 && (
              <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  aria-expanded={isHistoryExpanded}
                  className="w-full min-h-[44px] flex items-center justify-between text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg px-2 -my-1"
                >
                  <span>Clues Unlocked So Far ({unlockedClues.length})</span>
                  {isHistoryExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  )}
                </button>

                {isHistoryExpanded && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/60 max-h-56 overflow-y-auto">
                    {unlockedClues.slice(0, clueNumber - 1).map((clue, idx) => (
                      <div key={idx} className="text-xs text-slate-300 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                        <span className="text-amber-400 font-bold mr-2">#{idx + 1}</span>
                        {clue}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          /* Game Over Screen (Victory / Loss / Surrender) */
          <section className="bg-slate-900 border border-slate-800/90 p-5 sm:p-7 rounded-2xl text-center flex flex-col items-center gap-4 sm:gap-5 shadow-2xl">
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-1">{hasWon ? "🎉" : hasGivenUp ? "🏳️" : "📺"}</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                {hasWon ? "TV Savant!" : hasGivenUp ? "Better Luck Tomorrow!" : "Season Cancelled"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {hasWon
                  ? "You cracked today's secret television series!"
                  : hasGivenUp
                    ? `You gave up after seeing ${clueNumber} clues. Better luck on tomorrow's show!`
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
                    <Tv className="w-8 h-8 text-slate-400" aria-hidden="true" />
                  </div>
                )}
                <div className="text-center sm:text-left flex flex-col justify-center">
                  <span className="text-xs uppercase tracking-wider text-sky-400 font-bold">
                    Target Series
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                    {solution.title}
                  </h3>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    Premiered in {solution.year}
                  </span>
                </div>
              </div>
            )}

            {(hasWon || hasGivenUp) && (
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Score
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                    {hasGivenUp ? currentPotentialScore : animatedScore}
                  </span>
                  {hasGivenUp && user && (
                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                      0 pts added
                    </span>
                  )}
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {hasGivenUp ? "Clues Seen" : "Clues Used"}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-200 mt-0.5">
                    {clueNumber}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    TV Streak
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

            {hasGivenUp && (
              <div className="text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-800/70 px-3 py-1 rounded-full">
                🏳️ Better Luck Tomorrow
              </div>
            )}

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
              <span>{hasGivenUp ? `I gave up after ${clueNumber} clues` : "Share TV Result"}</span>
            </button>

            {/* Countdown until next mystery series */}
            <NextGameCountdown onRefresh={initGame} />

            {/* Cross-Promotion Link to Movie Edition */}
            <div className="w-full bg-gradient-to-r from-amber-500/10 via-slate-950/80 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Film className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Want to test your cinema knowledge?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deduce today&apos;s mystery film on 40 Clues Movie Edition
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>Play Movie Edition</span>
                <span>→</span>
              </Link>
            </div>

            {/* View unrevealed clues */}
            <button
              id="series-toggle-remaining-clues"
              onClick={() => setShowRemainingClues(!showRemainingClues)}
              aria-expanded={showRemainingClues}
              aria-controls="series-remaining-clues-list"
              className="text-xs font-medium text-slate-300 hover:text-slate-100 underline underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              {showRemainingClues
                ? "Hide remaining clues"
                : "Curious? View all remaining clues"}
            </button>

            {showRemainingClues && remainingClues.length > 0 && (
              <div
                id="series-remaining-clues-list"
                role="region"
                aria-labelledby="series-toggle-remaining-clues"
                className="mt-2 max-h-40 overflow-y-auto text-left space-y-2 p-3 bg-slate-950/50 border border-slate-800 rounded-xl w-full"
              >
                {remainingClues.map((clue, idx) => (
                  <p key={idx} className="text-xs text-slate-300">
                    <span className="text-sky-400 font-bold mr-2">
                      #{clueNumber + idx + 1}
                    </span>
                    {clue}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 40Clues 2026: TV Series Edition. Daily Television Deduction.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              Feedback
            </button>
            <Link
              href="/privacy"
              className="hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SeriesHowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      <SeriesLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameDate={gameDate}
        isLoggedIn={Boolean(user)}
        onLogin={handleLogin}
      />

      <SeriesShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        score={hasGivenUp ? currentPotentialScore : currentPotentialScore}
        clueNumber={clueNumber}
        totalClues={totalClues}
        streak={streak}
        rankBadge={getRankBadge(currentPotentialScore)}
        seriesTitle={solution?.title || "Mystery Series"}
        seriesYear={solution?.year || ""}
        hasWon={hasWon}
        hasGivenUp={hasGivenUp}
        gameDate={gameDate}
      />

      <SeriesGiveUpModal
        isOpen={isGiveUpModalOpen}
        onClose={() => setIsGiveUpModalOpen(false)}
        onConfirm={handleGiveUpConfirm}
        clueNumber={clueNumber}
        currentScore={currentPotentialScore}
        isSubmitting={isSubmitting}
      />

      <GuestNameModal
        isOpen={isGuestNameModalOpen}
        onClose={() => setIsGuestNameModalOpen(false)}
        onSubmitName={handleGuestSubmitName}
        score={pendingWinData?.score || 0}
        cluesUsed={pendingWinData?.cluesUsed || 1}
        streak={streak}
        onLogin={handleLogin}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        userId={user?.id}
      />
    </div>
  );
}
