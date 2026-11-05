"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Calendar, Play, CheckCircle2, Tv, Lock, User, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface ArchiveGameItem {
  id: string;
  game_date: string;
  year?: number;
  seasons?: number;
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

interface SeriesArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentGameDate: string;
  isLoggedIn: boolean;
  onLogin: () => void;
}

export default function SeriesArchiveModal({
  isOpen,
  onClose,
  onSelectDate,
  currentGameDate,
  isLoggedIn,
  onLogin,
}: SeriesArchiveModalProps) {
  const [games, setGames] = useState<ArchiveGameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, LocalGameStatus>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const isAuthRequired = !isLoggedIn;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;

    const fetchArchive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/series/archive", { headers });
        const data = await res.json();

        if (res.status === 401 || data.isGuest) {
          return;
        }

        if (!res.ok) {
          setError(data.error || "Failed to load TV series archive");
          return;
        }

        const items: ArchiveGameItem[] = data.games || [];
        setGames(items);

        // Read local status for each game from localStorage
        const today = new Date().toISOString().split("T")[0];
        const statuses: Record<string, LocalGameStatus> = {};

        items.forEach((item) => {
          const isToday = item.game_date === today;
          const raw = localStorage.getItem(`40clues_tv_progress_${item.game_date}`);
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
  }, [isOpen, isLoggedIn, supabase]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-archive-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Tv className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="series-archive-modal-title"
                className="text-lg sm:text-xl font-extrabold text-slate-100"
              >
                TV Series Archive
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse and solve past daily television mysteries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close archive modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content list or Locked State */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          {isAuthRequired ? (
            <div className="py-8 px-4 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
                <Lock className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Members-Only TV Archive
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Guests can only play today&apos;s live television puzzle. Sign in with Google to
                  unlock past TV shows, track your stats, and climb the Series Leaderboard — free!
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onLogin();
                }}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <User className="w-4 h-4 text-slate-950" aria-hidden="true" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" aria-hidden="true" />
              <p className="text-xs font-semibold">Tuning into TV puzzle archives...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-400 text-xs font-medium space-y-2">
              <p>{error}</p>
              <button
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>No past TV series puzzles available yet. Check back tomorrow!</p>
            </div>
          ) : (
            games.map((game) => {
              const status = localStatuses[game.game_date];
              const isCurrent = game.game_date === currentGameDate;
              const isToday = status?.isToday;

              return (
                <div
                  key={game.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        status?.hasWon
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : status?.hasLost
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : isCurrent
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {status?.hasWon ? (
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                          {formatDate(game.game_date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Today
                          </span>
                        )}
                        {game.seasons && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {game.seasons} {game.seasons === 1 ? "Season" : "Seasons"}
                          </span>
                        )}
                      </div>

                      {status?.hasWon && status.title ? (
                        <p className="text-[11px] text-emerald-400 truncate mt-0.5 font-medium">
                          {status.title} {status.year ? `(${status.year})` : ""} •{" "}
                          {status.score} pts ({status.cluesUsed} clues)
                        </p>
                      ) : status?.hasLost && status.title ? (
                        <p className="text-[11px] text-rose-400 truncate mt-0.5 font-medium">
                          {status.title} {status.year ? `(${status.year})` : ""} • Unsolved
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {game.year ? `Premiered in ${game.year}` : "Mystery Series"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isCurrent ? (
                      <span className="text-xs font-bold text-sky-400 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30">
                        Playing
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectDate(game.game_date);
                          onClose();
                        }}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          status?.hasWon || status?.hasLost
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            : "bg-sky-500 hover:bg-sky-400 text-slate-950"
                        }`}
                        title={`Play puzzle for ${game.game_date}`}
                        aria-label={`Play puzzle for ${game.game_date}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>{status?.hasWon || status?.hasLost ? "Review" : "Play"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{games.length} total puzzles</span>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white font-semibold py-1 px-2 rounded hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
