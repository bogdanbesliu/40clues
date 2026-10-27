"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Sparkles, X, User, ArrowRight } from "lucide-react";

interface GuestNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitName: (name: string) => void;
  score: number;
  cluesUsed: number;
  initialName?: string;
}

export default function GuestNameModal({
  isOpen,
  onClose,
  onSubmitName,
  score,
  cluesUsed,
  initialName = "",
}: GuestNameModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("40clues_anon_name") || "";
      // If it's a default Cinephile_1234, let them start fresh or keep it
      setName(stored);
      setError(null);
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 25) {
      setError("Name must be 25 characters or fewer.");
      return;
    }
    onSubmitName(trimmed);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-name-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="guest-name-title" className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-1.5">
              <span>Victory! Claim Your Spot</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Solved in <strong className="text-slate-200">{cluesUsed}/40 clues</strong> for{" "}
              <strong className="text-amber-400">{score} pts</strong>
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">
          How would you like to be displayed on today's <strong className="text-slate-100">Daily Leaderboard</strong>?
        </p>

        {/* Name Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. CinemaSleuth, FilmBuff99..."
              maxLength={25}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all"
            />
          </div>

          {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span>Confirm & View Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="min-h-[44px] px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Stay Anonymous
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
