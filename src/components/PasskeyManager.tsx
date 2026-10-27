"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  Laptop,
  Smartphone,
} from "lucide-react";
import { getSupabaseBrowserClient, isPasskeySupported } from "@/lib/supabaseBrowser";

interface PasskeyItem {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

function getDefaultDeviceName(): string {
  if (typeof window === "undefined") return "My Passkey";
  const ua = window.navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone (Face ID / Touch ID)";
  if (/iPad/.test(ua)) return "iPad (Touch ID / Face ID)";
  if (/Macintosh/.test(ua)) return "Mac (Touch ID)";
  if (/Windows/.test(ua)) return "Windows PC (Windows Hello)";
  if (/Android/.test(ua)) return "Android Device (Biometrics)";
  return "Security Key / Device";
}

function getDeviceIcon(name?: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("phone") || lower.includes("android") || lower.includes("ios") || lower.includes("ipad")) {
    return <Smartphone className="w-4 h-4 text-amber-400" aria-hidden="true" />;
  }
  if (lower.includes("mac") || lower.includes("windows") || lower.includes("pc") || lower.includes("laptop")) {
    return <Laptop className="w-4 h-4 text-amber-400" aria-hidden="true" />;
  }
  return <KeyRound className="w-4 h-4 text-amber-400" aria-hidden="true" />;
}

export default function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [supported, setSupported] = useState(false);

  const supabase = getSupabaseBrowserClient();

  const fetchPasskeys = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.passkey.list();
      if (!error && Array.isArray(data)) {
        setPasskeys(data);
      }
    } catch {
      // Ignored if list API not supported or empty
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setSupported(isPasskeySupported());
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setNotification(null);

    try {
      const { data, error } = await supabase.auth.registerPasskey();

      if (error) {
        const msg = error.message || "";
        // If aborted or dismissed by user, fail gracefully
        if (
          error.name === "NotAllowedError" ||
          error.name === "AbortError" ||
          msg.toLowerCase().includes("abort") ||
          msg.toLowerCase().includes("cancel")
        ) {
          setIsRegistering(false);
          return;
        }

        if (msg.toLowerCase().includes("not enabled")) {
          setNotification({
            type: "error",
            message:
              "Passkeys are not yet enabled in the Supabase Dashboard. Please enable Passkey authentication under Authentication > Passkeys.",
          });
        } else {
          setNotification({
            type: "error",
            message: error.message || "Failed to register passkey.",
          });
        }
        setIsRegistering(false);
        return;
      }

      if (data?.id) {
        const friendlyName = getDefaultDeviceName();
        try {
          await supabase.auth.passkey.update({
            passkeyId: data.id,
            friendlyName,
          });
        } catch {}

        await fetchPasskeys();
        setNotification({
          type: "success",
          message: `Passkey registered successfully as "${friendlyName}"! You can now use biometrics to sign in.`,
        });
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (
        error.name === "NotAllowedError" ||
        error.name === "AbortError" ||
        error.message?.toLowerCase().includes("cancel")
      ) {
        setIsRegistering(false);
        return;
      }
      setNotification({
        type: "error",
        message: error.message || "Passkey registration failed.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    setDeletingId(passkeyId);
    setNotification(null);
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId });
      if (error) {
        setNotification({
          type: "error",
          message: error.message || "Failed to remove passkey.",
        });
      } else {
        setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
        setNotification({
          type: "success",
          message: "Passkey removed from your account.",
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setNotification({
        type: "error",
        message: error.message || "Failed to delete passkey.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-labelledby="passkeys-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2
          id="passkeys-heading"
          className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5"
        >
          <Fingerprint className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span>Biometrics & Passkeys</span>
        </h2>
        {supported && (
          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={isRegistering}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Passkey</span>
              </>
            )}
          </button>
        )}
      </div>

      {notification && (
        <div
          role="alert"
          className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border border-rose-800 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
          )}
          <span className="flex-1">{notification.message}</span>
        </div>
      )}

      {!supported ? (
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 flex items-center gap-3">
          <Shield className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
          <span>WebAuthn passkeys are not supported by this browser.</span>
        </div>
      ) : isLoading ? (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" aria-hidden="true" />
          <span>Loading security credentials...</span>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">No passkeys registered yet</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Register Face ID, Touch ID, or Windows Hello to log in instantly without passwords.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegisterPasskey}
            disabled={isRegistering}
            className="w-full sm:w-auto min-h-[36px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Prompting Biometrics...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" aria-hidden="true" />
                <span>Add This Device</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {passkeys.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/80 border border-slate-800/90 p-3 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                  {getDeviceIcon(p.friendly_name)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate">
                    {p.friendly_name || "Registered Passkey"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Added {new Date(p.created_at).toLocaleDateString()}
                    {p.last_used_at ? ` • Last used ${new Date(p.last_used_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeletePasskey(p.id)}
                disabled={deletingId === p.id}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
                aria-label={`Remove passkey ${p.friendly_name || p.id}`}
              >
                {deletingId === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
