"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  LogIn,
  Fingerprint,
  Loader2,
  Sparkles,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { getSupabaseBrowserClient, isPasskeySupported } from "@/lib/supabaseBrowser";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  redirectTo,
  onSuccess,
}: AuthModalProps) {
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPasskeySupported(isPasskeySupported());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setErrorMessage(null);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.origin.includes("localhost") ||
          window.location.origin.includes("127.0.0.1"));
      const redirectOrigin = isLocal ? window.location.origin : "https://40clues.com";
      const targetNext = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectOrigin}/auth/callback${targetNext}`,
        },
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to initiate Google sign-in.");
      setIsGoogleLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setErrorMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPasskey();

      if (error) {
        const msg = error.message || "";
        // Don't show an error if user simply aborted or cancelled the prompt
        if (
          error.name === "NotAllowedError" ||
          error.name === "AbortError" ||
          msg.toLowerCase().includes("abort") ||
          msg.toLowerCase().includes("cancel")
        ) {
          setIsPasskeyLoading(false);
          return;
        }

        if (msg.toLowerCase().includes("not enabled")) {
          setErrorMessage(
            "Passkeys are not yet enabled in the Supabase Dashboard. Sign in with Google first."
          );
        } else {
          setErrorMessage(
            error.message || "Could not authenticate with passkey. Please try again."
          );
        }
        setIsPasskeyLoading(false);
        return;
      }

      if (data?.session) {
        setIsPasskeyLoading(false);
        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (
        error.name === "NotAllowedError" ||
        error.name === "AbortError" ||
        error.message?.toLowerCase().includes("cancel")
      ) {
        setIsPasskeyLoading(false);
        return;
      }
      setErrorMessage(
        error.message || "Passkey authentication encountered an error."
      );
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-black text-slate-100">
                Sign In
              </h2>
              <p className="text-[11px] text-slate-400">Join the 40Clues detectives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close sign in dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Benefits reminder */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
          Sign in to preserve your daily streaks, access the full archive of past puzzles, and climb global leaderboards.
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {passkeySupported && (
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPasskeyLoading || isGoogleLoading}
              className="w-full min-h-[46px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 rounded-xl flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPasskeyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Verifying Passkey...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-slate-950" aria-hidden="true" />
                  <span>Sign in with Passkey</span>
                </>
              )}
            </button>
          )}

          {passkeySupported && (
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                or
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isPasskeyLoading || isGoogleLoading}
            className="w-full min-h-[46px] bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold px-4 rounded-xl flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" aria-hidden="true" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Passkey helper footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 leading-normal">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Passkeys let you sign in with Face ID, Touch ID, or Windows Hello. You can register this device anytime in your{" "}
            <strong className="text-slate-200">Profile</strong> settings.
          </span>
        </div>
      </div>
    </div>
  );
}
