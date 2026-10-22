"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, Medal, Loader2, User } from "lucide-react";

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

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/leaderboard?date=${gameDate}`)
      .then((res) => res.json())
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [isOpen, gameDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold text-slate-100">Daily Leaderboard</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>Loading scores...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No logged scores yet for today. Be the first to claim the top spot!
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </span>
                  {entry.profiles?.avatar_url ? (
                    <img
                      src={entry.profiles.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-200 truncate max-w-[150px]">
                    {entry.profiles?.display_name || "Anonymous Cinephile"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs text-slate-400">{entry.clues_used}/40 clues</span>
                  <span className="text-sm font-bold text-amber-400">{entry.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}