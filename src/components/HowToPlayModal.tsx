"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  HelpCircle,
  Film,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  onLogin?: () => void;
}

export default function HowToPlayModal({
  isOpen,
  onClose,
}: HowToPlayModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Focus first focusable element inside modal
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
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="how-to-play-title" className="text-lg sm:text-xl font-black text-slate-100">
                How to Play 40Clues
              </h2>
              <p className="text-xs text-slate-400">Rules, scoring, and lifelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close rules modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Rules section */}
        <div className="flex flex-col gap-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-3">
            <Film className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">One Secret Movie Daily:</span> You have a shuffled deck of up to 40 clues about today's target film.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Random Clue Types:</span> You'll uncover real plot details, behind-the-scenes trivia, iconic quotes, absurd background facts, or hilarious bad plot summaries!
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Trophy className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Scoring:</span> Start with <strong className="text-amber-400 font-bold">1,000 points</strong>. Each wrong guess drops your score by <strong className="text-rose-400 font-bold">25 pts</strong>, and passing drops <strong className="text-rose-400 font-bold">10 pts</strong> (first pass is free!). Minimum score is 25 pts.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-sm flex-shrink-0" aria-hidden="true">💡</span>
            <div>
              <span className="font-bold text-slate-100">Tactical Intel:</span> Need a hint? Unlock the <strong className="text-amber-400 font-bold">Release Decade</strong> or <strong className="text-amber-400 font-bold">Primary Genre</strong> for <strong className="text-rose-400 font-bold">-50 points</strong> each.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Flame className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-slate-100">Daily Streaks:</span> Solve the puzzle each day to build your active streak!
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 text-xs mt-1"
        >
          Got it, let's play!
        </button>
      </div>
    </div>
  );
}
