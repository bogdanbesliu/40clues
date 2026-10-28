"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Film, CheckCircle2, X, Play, Lock, User } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface ArchiveGameItem {
  id: string;
  game_date: string;
  year?: number;
}

interface LocalGameStatus {
  hasWon: boolean;
  hasLost: boolean;
  score?: number;
  cluesUsed?: number;
  title?: string;
  year?: number;
  isToday: boolean;
}

export default function ArchivePage() {
  const [games, setGames] = useState<ArchiveGameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, LocalGameStatus>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"));
    const redirectOrigin = isLocal ? window.location.origin : "https://40clues.com";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectOrigin}/auth/callback?next=/archive`,
      },
    });
  };

  useEffect(() => {
    const fetchArchive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setIsAuthRequired(true);
          setIsLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${session.access_token}`,
        };

        const res = await fetch("/api/games/archive", { headers });
        const data = await res.json();

        if (res.status === 401 || data.isGuest) {
          setIsAuthRequired(true);
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setError(data.error || "Failed to load archive");
          return;
        }

        const items: ArchiveGameItem[] = data.games || [];
        setGames(items);

        const today = new Date().toISOString().split("T")[0];
        const statuses: Record<string, LocalGameStatus> = {};

        items.forEach((item) => {
          const isToday = item.game_date === today;
          const raw = localStorage.getItem(`40clues_progress_${item.game_date}`);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              statuses[item.game_date] = {
                hasWon: !!parsed.hasWon,
                hasLost: !!parsed.hasLost,
                score: parsed.hasWon ? Math.max(25, 1000 - (parsed.scorePenalty || 0)) : 0,
                cluesUsed: parsed.clueNumber || 1,
                title: parsed.solution?.title,
                year: parsed.solution?.year,
                isToday,
              };
            } catch {
              statuses[item.game_date] = { hasWon: false, hasLost: false, isToday };
            }
          } else {
            statuses[item.game_date] = { hasWon: false, hasLost: false, isToday };
          }
        });

        setLocalStatuses(statuses);
      } catch {
        setError("Network error fetching archive.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchive();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 font-sans selection:bg-amber-500/30">
      <div className="max-w-xl w-full flex flex-col gap-6">
        {/* Back Navigation */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
            aria-label="Back to today's puzzle"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Today's Puzzle</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Calendar className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Puzzle Archive</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Every past mystery cinema deduction puzzle, available to play anytime
            </p>
          </div>
        </header>

        {/* Locked State for Guests or Archive List */}
        {isAuthRequired ? (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center gap-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Lock className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-black text-slate-100">
                Members-Only Puzzle Archive
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Guest players can only solve today's live puzzle. Sign in with Google to unlock access to all previous daily puzzles, track your archive completion, and climb the Global Leaderboards — membership is 100% free!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full max-w-xs">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full min-h-[46px] px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <User className="w-4 h-4 text-slate-950" aria-hidden="true" />
                <span>Sign in with Google</span>
              </button>
              <Link
                href="/"
                className="w-full min-h-[46px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Play Today's Puzzle
              </Link>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="inline-block animate-spin text-2xl text-amber-400">⏳</div>
                <p className="text-xs text-slate-400">Loading puzzle archive...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-rose-400 text-xs">
                <p>{error}</p>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No past puzzles available yet.
              </div>
            ) : (
              games.map((game) => {
                const status = localStatuses[game.game_date];
                const isToday = status?.isToday;
                const decade = game.year ? `${Math.floor(Number(game.year) / 10) * 10}s` : null;

                return (
                  <Link
                    key={game.id || game.game_date}
                    href={`/?date=${game.game_date}`}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/40 transition-all flex items-center justify-between gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm"
                    aria-label={`Play puzzle for ${formatDate(game.game_date)}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          status?.hasWon
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : status?.hasLost
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-slate-800 border border-slate-700 text-slate-300 group-hover:border-amber-500/40 group-hover:text-amber-400"
                        }`}
                        aria-hidden="true"
                      >
                        {status?.hasWon ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : status?.hasLost ? (
                          <X className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Film className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-sm group-hover:text-amber-300 transition-colors">
                            {formatDate(game.game_date)}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                              Today
                            </span>
                          )}
                          {status?.hasWon && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                              Solved • {status.score} pts
                            </span>
                          )}
                          {status?.hasLost && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                              Unsolved
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {status?.hasWon && status.title ? (
                            <span className="text-slate-300 font-medium">
                              {status.title} {status.year ? `(${status.year})` : ""}
                            </span>
                          ) : status?.hasLost && status.title ? (
                            <span className="text-rose-300/80 font-medium">
                              {status.title} {status.year ? `(${status.year})` : ""}
                            </span>
                          ) : decade ? (
                            <span>Mystery Film from the {decade}</span>
                          ) : (
                            <span>40 Clues Cinema Puzzle</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-400 group-hover:text-amber-400 flex items-center gap-1.5 transition-colors flex-shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                      <span>
                        {status?.hasWon || status?.hasLost ? "Review" : "Play"}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Footer info note */}
        <footer className="pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
          © 40Clues 2026 • Cinema Deduction Game
        </footer>
      </div>
    </main>
  );
}
