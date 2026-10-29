"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Trophy,
  Sparkles,
  X,
  User,
  ArrowRight,
  Loader2,
  Flame,
  ShieldCheck,
  Check,
  LogIn,
} from "lucide-react";

interface GuestNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitName: (name: string) => void;
  score: number;
  cluesUsed: number;
  streak?: number;
  onLogin?: () => void;
  initialName?: string;
}

const getBadgeInfo = (scoreValue: number) => {
  if (scoreValue >= 950) return { title: "🎯 Cinephile Psychic", tier: "Top 2%" };
  if (scoreValue >= 800) return { title: "🍿 Film Buff", tier: "Top 15%" };
  if (scoreValue >= 500) return { title: "🎟️ Casual Viewer", tier: "Top 40%" };
  if (scoreValue >= 200) return { title: "🕵️ Desperate Detective", tier: "Survivor" };
  return { title: "🪢 Skin of Teeth", tier: "Survivor" };
};

export default function GuestNameModal({
  isOpen,
  onClose,
  onSubmitName,
  score,
  cluesUsed,
  streak = 0,
  onLogin,
  initialName = "",
}: GuestNameModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const badge = getBadgeInfo(score);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const stored = localStorage.getItem("40clues_anon_name") || "";
      setName(stored);
      setError(null);
      setIsValidating(false);
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

        if (e.key === "Tab") {
          const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements && focusableElements.length > 0) {
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      onSubmitName("");
      return;
    }
    if (trimmed.length > 25) {
      setError("Name must be 25 characters or fewer.");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch("/api/name/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(
          data.error ||
            "This name contains restricted or inappropriate language. Please choose another name."
        );
        setIsValidating(false);
        return;
      }
      onSubmitName(trimmed);
    } catch {
      onSubmitName(trimmed);
    } finally {
      setIsValidating(false);
    }
  };

  const handleGoogleSignIn = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed.length <= 25) {
      try {
        localStorage.setItem("40clues_anon_name", trimmed);
      } catch {}
    }
    if (onLogin) {
      onLogin();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-name-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in motion-reduce:animate-none duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 motion-reduce:animate-none duration-200"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 pr-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="guest-name-title"
              className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-1.5 flex-wrap"
            >
              <span>Victory! Claim Your Spot</span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-400">
                Solved in <strong className="text-slate-200">{cluesUsed}/40 clues</strong> for{" "}
                <strong className="text-amber-400">{score} pts</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                {badge.title} • {badge.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Guest Name Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="guest-name-input"
                className="text-xs font-semibold text-slate-300"
              >
                Leaderboard Detective Handle
              </label>
              {name.trim().length >= 3 && !error && (
                <span
                  className="text-[11px] text-emerald-400 font-medium flex items-center gap-1"
                  aria-hidden="true"
                >
                  <Check className="w-3 h-3" aria-hidden="true" /> Ready
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="guest-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "guest-name-error" : undefined}
                placeholder="e.g. CinemaSleuth, FilmBuff99..."
                maxLength={25}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all"
              />
            </div>
          </div>

          {error && (
            <span id="guest-name-error" role="alert" className="text-[11px] text-rose-400 font-medium">
              {error}
            </span>
          )}

          {/* Loss Aversion / Identity Protection Banner */}
          {streak > 0 ? (
            <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Flame className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-amber-300">
                  {streak > 1 ? `${streak}-Day Streak at Risk!` : "1-Day Streak Started!"}
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                  Guest streaks and stats are stored only in this browser's cache. Connect with Google to protect your streak and badges permanently in the cloud.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-700/80 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-100">
                  Protect Your Detective Record
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                  Sign in with Google to protect your scores, unlock All-Time Global rankings, and play 100+ past archive mysteries free.
                </p>
              </div>
            </div>
          )}

          {/* Hero Conversion CTA: 1-Click Google Sign In */}
          {onLogin && (
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isValidating}
                className="w-full min-h-[46px] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <LogIn className="w-4 h-4 text-slate-950 shrink-0" aria-hidden="true" />
                <span>Save Streak & Claim Badge with Google</span>
              </button>
              <p className="text-[10px] text-center text-slate-400">
                100% free • 1-click sign-in • Never lose your detective rank
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center my-0.5">
            <div className="border-t border-slate-800 w-full" aria-hidden="true" />
            <span className="bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              or post without cloud backup
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={isValidating}
              className="flex-1 min-h-[44px] bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-amber-400" aria-hidden="true" />
                  <span>Checking name...</span>
                </>
              ) : (
                <>
                  <span>Post to Today's Board</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isValidating}
              className="min-h-[44px] px-3 bg-transparent hover:bg-slate-800 disabled:opacity-50 text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Stay Anonymous
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}