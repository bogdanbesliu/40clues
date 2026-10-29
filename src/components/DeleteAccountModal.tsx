"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Flame,
  Award,
  Globe,
  Film,
  X,
  Trash2,
  Loader2,
} from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
  userStats?: {
    currentStreak?: number;
    totalPlayed?: number;
    totalPoints?: number;
    unlockedBadgesCount?: number;
  };
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirmDelete,
  userStats,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = confirmText.trim() === "DELETE";

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText("");
      setIsDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Accessibility: Focus trap, escape key, body scroll lock, focus restoration
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus input on open after animation
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable || focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, isDeleting, onClose]);

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onConfirmDelete();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setErrorMessage(message);
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-desc"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-rose-900/60 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col my-auto max-h-[90vh] overflow-y-auto"
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Cancel and close dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span>Permanent &amp; Irreversible</span>
            </span>
          </div>

          <h2
            id="delete-account-title"
            className="text-lg sm:text-xl font-black text-slate-100 tracking-tight"
          >
            Close Your Detective File?
          </h2>

          <p id="delete-account-desc" className="text-xs text-slate-300 leading-relaxed">
            Once the reel ends, it cannot be rewound. Deleting your account will immediately and permanently erase your career at 40Clues. There is no backup or recovery.
          </p>
        </div>

        {/* Detailed Breakdown Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 sm:p-4 mb-4 flex flex-col gap-3">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400/90">
            What will be permanently erased:
          </span>

          <ul className="flex flex-col gap-2.5 text-xs">
            {/* Streak */}
            <li className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg bg-orange-950/40 border border-orange-800/60 flex items-center justify-center text-orange-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Flame className="w-4 h-4 fill-orange-400/20" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-200 block">
                  Active Win Streak &amp; Freezes
                </span>
                <span className="text-slate-400 text-[11px] leading-snug block">
                  Your active {userStats?.currentStreak ? `${userStats.currentStreak}-day ` : ""}streak and any saved streak freezes will be wiped back to day zero.
                </span>
              </div>
            </li>

            {/* Badges */}
            <li className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-200 block">
                  Unlocked Badges &amp; Milestones
                </span>
                <span className="text-slate-400 text-[11px] leading-snug block">
                  All detective accolades {userStats?.unlockedBadgesCount ? `(${userStats.unlockedBadgesCount} unlocked) ` : ""}(Cinephile Psychic, Hat-Trick, Century Club) and milestone progress will be lost.
                </span>
              </div>
            </li>

            {/* Hall of Fame */}
            <li className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-200 block">
                  Global Hall of Fame Standing
                </span>
                <span className="text-slate-400 text-[11px] leading-snug block">
                  Your career total {userStats?.totalPoints ? `(${userStats.totalPoints.toLocaleString()} pts) ` : ""}will be expunged from the All-Time Leaderboard and daily scoreboards.
                </span>
              </div>
            </li>

            {/* Solved History */}
            <li className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-center justify-center text-rose-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Film className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-200 block">
                  Solved Mystery Log &amp; Account Data
                </span>
                <span className="text-slate-400 text-[11px] leading-snug block">
                  All movie history, guess distributions, display names, and linked credentials will be permanently purged from the database.
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Confirmation Input Field */}
        <div className="mb-4">
          <label
            htmlFor="delete-confirm-input"
            className="block text-xs font-semibold text-slate-300 mb-1.5"
          >
            To confirm deletion, type <span className="text-rose-400 font-black tracking-wider">DELETE</span> in all caps below:
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            disabled={isDeleting}
            autoComplete="off"
            spellCheck="false"
            placeholder="DELETE"
            aria-required="true"
            aria-invalid={confirmText.length > 0 && !isConfirmed}
            aria-describedby={errorMessage ? "delete-error-desc" : undefined}
            className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all"
          />

          {errorMessage && (
            <p
              id="delete-error-desc"
              role="alert"
              className="text-xs text-rose-400 font-medium mt-2 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>

        {/* Live Status Region */}
        <div aria-live="polite" className="sr-only">
          {isDeleting ? "Account deletion is in progress. Please do not close your browser." : ""}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-[0.99] transition-all flex items-center justify-center touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Keep My Account
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Erasing Detective File...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
