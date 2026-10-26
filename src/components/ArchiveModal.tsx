"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Play, CheckCircle2, Trophy, Clock, Film } from "lucide-react";

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

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  currentGameDate: string;
}

export default function ArchiveModal({
  isOpen,
  onClose,
  onSelectDate,
  currentGameDate,
}: ArchiveModalProps) {
  const [games, setGames] = useState<ArchiveGameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, LocalGameStatus>>({});

  useEffect(() => {
    if (!isOpen) return;

    const fetchArchive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/games/archive");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load archive");
          return;
        }

        const items: ArchiveGameItem[] = data.games || [];
        setGames(items);

        // Read local status for each game from localStorage
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
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
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
      aria-labelledby="archive-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="archive-modal-title" className="text-lg sm:text-xl font-extrabold text-slate-100">
                Puzzle Archive
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse and play past mystery movie puzzles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close archive modal"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
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
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>No past puzzles available yet.</p>
            </div>
          ) : (
            games.map((g) => {
              const status = localStatuses[g.game_date];
              const isSelected = g.game_date === currentGameDate;
              const isToday = status?.isToday;

              return (
                <div
                  key={g.id || g.game_date}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                        status?.hasWon
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : status?.hasLost
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                      aria-hidden="true"
                    >
                      {status?.hasWon ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : status?.hasLost ? (
                        <X className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Film className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-200">
                          {formatDate(g.game_date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                            Today
                          </span>
                        )}
                        {isSelected && !isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {status?.hasWon && status.title ? (
                          <span className="text-slate-300 font-medium">
                            {status.title} {status.year ? `(${status.year})` : ""} •{" "}
                            <strong className="text-amber-400">{status.score} pts</strong>
                          </span>
                        ) : status?.hasLost && status.title ? (
                          <span className="text-rose-300 font-medium">
                            {status.title} {status.year ? `(${status.year})` : ""} • Unsolved
                          </span>
                        ) : g.year ? (
                          <span>Mystery Movie from the {Math.floor(Number(g.year) / 10) * 10}s</span>
                        ) : (
                          <span>40 Clues Cinema Puzzle</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate(g.game_date);
                      onClose();
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isSelected
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : status?.hasWon || status?.hasLost
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md hover:shadow-amber-500/20"
                    }`}
                    aria-label={`Play puzzle for ${formatDate(g.game_date)}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>
                      {isSelected
                        ? "Current"
                        : status?.hasWon || status?.hasLost
                        ? "Review"
                        : "Play"}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>🎲 Each puzzle has random RNG clue shuffle</span>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-400 hover:underline font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
