"use client";

import React, { useEffect, useRef } from "react";
import { X, Flag, AlertTriangle } from "lucide-react";

interface GiveUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clueNumber: number;
  currentScore: number;
  isSubmitting?: boolean;
}

export default function GiveUpModal({
  isOpen,
  onClose,
  onConfirm,
  clueNumber,
  currentScore,
  isSubmitting = false,
}: GiveUpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap and focus restoration to trigger
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Set initial focus to the safe "Keep Guessing" action
    const focusTimer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSubmitting) onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="giveup-modal-title"
      aria-describedby="giveup-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cancel and close dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header with Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Flag className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="giveup-modal-title" className="text-lg font-black text-slate-100">
              Admit Defeat?
            </h2>
            <p className="text-xs text-slate-400">
              Are you sure you want to give up?
            </p>
          </div>
        </div>

        {/* Warning Body Description */}
        <p id="giveup-modal-desc" className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          If you give up, today&apos;s secret movie title and all remaining clues will be revealed. Your current run will end, and this cannot be undone.
        </p>

        {/* Progress Snapshot Card */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
            <span>Clues revealed: <strong className="text-slate-100">{clueNumber} of 40</strong></span>
          </div>
          <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
            {currentScore} pts
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 mt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 hover:text-slate-100 font-bold text-xs border border-slate-700 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Keep Playing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="animate-spin">⏳</span> Revealing...
              </span>
            ) : (
              <span>Give Up & Reveal</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
