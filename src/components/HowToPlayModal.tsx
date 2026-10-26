"use client";

import React from "react";
import { X, HelpCircle, Film, Sparkles, Trophy, Flame } from "lucide-react";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h2 id="how-to-play-title" className="text-xl font-black text-slate-100">
              How to Play 40Clues
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close rules modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm text-slate-300 leading-relaxed">
          <div className="flex items-start gap-3">
            <Film className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">One Secret Movie Daily:</span> You have a deck of up to 40 shuffled clues about today's target film.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Random Clue Types:</span> You'll get real plot details, behind-the-scenes trivia, iconic quotes, absurd background facts, or bad plot summaries!
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Scoring:</span> Start with <strong className="text-amber-400">1,000 points</strong>. Each wrong guess drops your score by <strong className="text-rose-400">25 points</strong>, and passing a clue drops <strong className="text-rose-400">10 points</strong> (first pass is free!). Minimum 25 pts for a win.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-base flex-shrink-0" aria-hidden="true">💡</span>
            <div>
              <span className="font-bold text-slate-100">Tactical Intel:</span> Need a hint? Unlock the <strong className="text-amber-400">Release Decade</strong> or <strong className="text-amber-400">Primary Genre</strong> for <strong className="text-rose-400">-50 points</strong> each.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Streaks & Leaderboard:</span> Guess every day to build your streak. Sign in to save your rank on the Daily Leaderboard!
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Got it, let's play!
        </button>
      </div>
    </div>
  );
}