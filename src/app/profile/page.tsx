"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Target,
  Award,
  Calendar,
  LogIn,
  LogOut,
  Film,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import DeleteAccountModal from "@/components/DeleteAccountModal";

interface BadgeItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  current: number;
  target: number;
  unlocked: boolean;
}

interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
  stats: {
    totalPlayed: number;
    totalPoints: number;
    avgClues: number;
    currentStreak: number;
    maxStreak: number;
    distribution: {
      psychic: number;
      buff: number;
      casual: number;
      detective: number;
      skinOfTeeth: number;
    };
  };
  badges: BadgeItem[];
  history: Array<{
    gameDate: string;
    score: number;
    cluesUsed: number;
    movieTitle: string;
    movieYear: number | string;
  }>;
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Display Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const loadProfile = async (token?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/profile", {
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsGuest(false);
      } else {
        setIsGuest(true);
      }
    } catch (err) {
      console.error("Profile load error:", err);
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.access_token) {
          await loadProfile(session.access_token);
        } else {
          setIsGuest(true);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setIsGuest(true);
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.access_token) {
        setIsLoading(true);
        await loadProfile(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setIsGuest(true);
        setData(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGoogleLogin = async () => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"));
    const redirectOrigin = isLocal ? window.location.origin : "https://40clues.com";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectOrigin}/auth/callback?next=/profile`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  const handleDeleteAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error("You must be signed in to delete your account.");
    }

    const res = await fetch("/api/profile", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Failed to delete account. Please try again.");
    }

    localStorage.removeItem("40clues_streak");
    localStorage.removeItem("40clues_streak_freezes");
    localStorage.removeItem("40clues_guest_name");

    await supabase.auth.signOut();
    window.location.href = "/?account_deleted=true";
  };


  const handleStartEditName = () => {
    if (!data?.user) return;
    setNameInput(data.user.name);
    setNameError(null);
    setNameSuccess(false);
    setIsEditingName(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === data?.user.name) {
      setIsEditingName(false);
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 25) {
      setNameError("Name must be between 2 and 25 characters.");
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: trimmed }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setNameError(resData.error || "Failed to update name.");
        return;
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                name: trimmed,
              },
            }
          : prev
      );
      setIsEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError("Network error updating name.");
    } finally {
      setIsSavingName(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8">
        <div className="max-w-xl w-full animate-pulse flex flex-col gap-6">
          <div className="h-8 bg-slate-900 rounded w-32" />
          <div className="h-28 bg-slate-900 rounded-2xl" />
          <div className="h-40 bg-slate-900 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (isGuest || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center flex flex-col items-center gap-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">Detective Profile</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Sign in with Google to protect your daily streaks, unlock badges, and track your
              all-time cinema deduction history.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to today's puzzle
          </Link>
        </div>
      </main>
    );
  }

  const { user, stats, badges, history } = data;
  const maxDistributionCount = Math.max(
    1,
    stats.distribution.psychic,
    stats.distribution.buff,
    stats.distribution.casual,
    stats.distribution.detective,
    stats.distribution.skinOfTeeth
  );

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // Sort badges: unlocked or high progress first
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    const aProgress = a.current / a.target;
    const bProgress = b.current / b.target;
    return bProgress - aProgress;
  });

  const visibleBadges = showAllBadges ? sortedBadges : sortedBadges.slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 sm:py-8 font-sans selection:bg-amber-500/30">
      <div className="max-w-xl w-full flex flex-col gap-6">
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Play Daily Game</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* User Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 shadow-md">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              aria-hidden="true"
              className="w-13 h-13 rounded-full border-2 border-amber-400/80 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-13 h-13 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg flex-shrink-0" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    maxLength={25}
                    autoFocus
                    disabled={isSavingName}
                    placeholder="Display Name"
                    className="flex-1 min-w-[120px] bg-slate-950 border border-amber-500/70 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                  <button
                    type="submit"
                    disabled={isSavingName || !nameInput.trim() || nameInput.trim() === user.name}
                    className="min-h-[36px] min-w-[36px] p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center flex-shrink-0 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    title="Save name"
                    aria-label="Save name"
                  >
                    {isSavingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameError(null);
                    }}
                    disabled={isSavingName}
                    className="min-h-[36px] min-w-[36px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all flex items-center justify-center flex-shrink-0 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Cancel"
                    aria-label="Cancel editing"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {nameError && (
                  <span className="text-[11px] text-rose-400 font-medium">{nameError}</span>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                  <span className="truncate">{user.name}</span>
                  {stats.currentStreak >= 7 && (
                    <span className="text-[10px] bg-orange-950/80 text-orange-300 border border-orange-800 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                      PRO
                    </span>
                  )}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex-shrink-0 touch-manipulation"
                  title="Change display name"
                  aria-label="Change display name"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="inline-flex items-center gap-1.5 bg-orange-950/70 border border-orange-800/80 px-2.5 py-1 rounded-full text-xs font-bold text-orange-300 shadow-sm">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" aria-hidden="true" />
                <span>{stats.currentStreak} {stats.currentStreak === 1 ? "day streak" : "day streak"}🔥</span>
              </div>
              {nameSuccess && (
                <span className="text-[11px] text-emerald-400 font-bold animate-in fade-in">
                  ✓ Name updated!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Career Stats Grid */}
        <section aria-labelledby="career-stats-heading">
          <h2 id="career-stats-heading" className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">
            Career Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Played</span>
              <span className="text-2xl font-black text-slate-100 mt-1">{stats.totalPlayed}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Pts</span>
              <span className="text-2xl font-black text-amber-400 mt-1">{stats.totalPoints}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Streak</span>
              <span className="text-2xl font-black text-orange-400 mt-1">{stats.maxStreak}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Avg Clues</span>
              <span className="text-2xl font-black text-emerald-400 mt-1">{stats.avgClues}</span>
            </div>
          </div>
        </section>

        {/* Clue Guess Distribution */}
        <section aria-labelledby="guess-distribution-heading" className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <h2 id="guess-distribution-heading" className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Guess Distribution</span>
          </h2>

          <div className="flex flex-col gap-2.5 text-xs font-semibold">
            {[
              { label: "1–3 (Psychic)", count: stats.distribution.psychic, color: "bg-emerald-500" },
              { label: "4–10 (Film Buff)", count: stats.distribution.buff, color: "bg-teal-500" },
              { label: "11–25 (Casual)", count: stats.distribution.casual, color: "bg-amber-500" },
              { label: "26–39 (Detective)", count: stats.distribution.detective, color: "bg-orange-500" },
              { label: "40 (Skin of Teeth)", count: stats.distribution.skinOfTeeth, color: "bg-rose-500" },
            ].map((row, idx) => {
              const widthPct = Math.max(8, Math.round((row.count / maxDistributionCount) * 100));
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-32 text-slate-400 text-[11px] truncate">{row.label}</span>
                  <div className="flex-1 bg-slate-950 h-6 rounded-md overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full ${row.color} rounded text-slate-950 font-bold text-[10px] flex items-center justify-end px-2 transition-all duration-500`}
                      style={{ width: `${row.count > 0 ? widthPct : 0}%` }}
                    >
                      {row.count > 0 && row.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Badges & Milestones with Latest 4 and Progress x/y */}
        <section aria-labelledby="badges-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="badges-heading" className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Badges & Milestones ({unlockedCount}/{badges.length})</span>
            </h2>

            <button
              type="button"
              id="badges-toggle"
              aria-expanded={showAllBadges}
              aria-controls="badges-grid"
              onClick={() => setShowAllBadges(!showAllBadges)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              <span>{showAllBadges ? "Show less" : `See all (${badges.length})`}</span>
              {showAllBadges ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          </div>

          <div id="badges-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visibleBadges.map((b) => {
              const progressPct = Math.min(100, Math.round((b.current / b.target) * 100));
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    b.unlocked
                      ? "bg-slate-900/90 border-amber-500/40 text-slate-100 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl flex-shrink-0 ${b.unlocked ? "" : "grayscale opacity-60"}`} aria-hidden="true">
                      {b.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-100 truncate">{b.title}</h3>
                        {b.unlocked ? (
                          <span className="text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono font-semibold">
                            {b.current}/{b.target}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 leading-snug ${b.unlocked ? "text-slate-300" : "text-slate-400"}`}>
                        {b.desc}
                      </p>
                    </div>
                  </div>

                  {/* Progres x/y vizual */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/40">
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          b.unlocked ? "bg-amber-400" : "bg-slate-600"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Game History List */}
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Recent Solved Puzzles</span>
          </h2>

          {history.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl text-center text-xs text-slate-400">
              No games solved yet. Complete today's puzzle to record your score!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200">{h.movieTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {h.gameDate} {h.movieYear ? `• ${h.movieYear}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-amber-400">{h.score} pts</div>
                    <div className="text-[10px] text-slate-400">{h.cluesUsed} clues</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger Zone: Account Management */}
        <section
          aria-labelledby="danger-zone-heading"
          className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2
                id="danger-zone-heading"
                className="text-xs uppercase tracking-wider font-extrabold text-rose-400 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" aria-hidden="true" />
                <span>Danger Zone</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                Permanently delete your detective account, career points, daily streaks, badges, and all-time leaderboard standings. This action cannot be undone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="min-h-[44px] min-w-[44px] px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 active:bg-rose-950 text-rose-200 hover:text-white border border-rose-800/80 hover:border-rose-600 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 flex-shrink-0 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Trash2 className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span>Delete Account</span>
            </button>
          </div>
        </section>

        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirmDelete={handleDeleteAccount}
          userStats={{
            currentStreak: stats.currentStreak,
            totalPlayed: stats.totalPlayed,
            totalPoints: stats.totalPoints,
            unlockedBadgesCount: unlockedCount,
          }}
        />
      </div>
    </main>
  );
}