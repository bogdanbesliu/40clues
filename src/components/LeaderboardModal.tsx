"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, Loader2, User } from "lucide-react";

interface LeaderboardEntry {
  score: number;
  clues_used: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameDate: string;
}

export default function LeaderboardModal({ isOpen, onClose, gameDate }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus trap & blocare scroll fundal
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    setLoading(true);
    fetch(`/api/leaderboard?date=${gameDate}`)
      .then((res) => res.json())
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, gameDate, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close daily leaderboard modal"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <Trophy className="w-6 h-6 text-amber-400" aria-hidden="true" />
          <h2 id="leaderboard-modal-title" className="text-xl font-bold text-slate-100">
            Daily Leaderboard
          </h2>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-12 gap-3 text-slate-300"
            aria-live="polite"
          >
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" aria-hidden="true" />
            <span className="font-medium">Loading leaderboard rankings...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-slate-300 text-sm">
            No scores registered yet for today. Be the first to guess and top the podium!
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-sm font-bold text-slate-300">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </span>
                  {entry.profiles?.avatar_url ? (
                    <img
                      src={entry.profiles.avatar_url}
                      alt=""
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full object-cover border border-slate-600 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700"
                      aria-hidden="true"
                    >
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-100 truncate">
                    {entry.profiles?.display_name || "Anonymous Cinephile"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-right flex-shrink-0">
                  <span className="text-xs text-slate-400 font-medium">
                    {entry.clues_used}/40 clues
                  </span>
                  <span className="text-sm font-bold text-amber-400 min-w-[60px] text-right">
                    {entry.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}