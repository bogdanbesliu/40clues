"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Trophy, Loader2, User, Globe, Clock, LogIn, Sparkles } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface LeaderboardEntry {
  user_id?: string | null;
  score: number;
  clues_used: number;
  anon_name?: string | null;
  created_at?: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameDate: string;
  isLoggedIn?: boolean;
  onLogin?: () => void;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  gameDate,
  isLoggedIn = false,
  onLogin,
}: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "global">("daily");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Always reset to Daily Leaderboard as default whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("daily");
    }
  }, [isOpen]);

  // Track active user ID for highlighting their entry on the board
  useEffect(() => {
    if (isLoggedIn) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUserId(user?.id || null);
      });
    } else {
      setCurrentUserId(null);
    }
  }, [isLoggedIn, supabase]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus first focusable element
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

    setLoading(true);

    const loadEntries = async () => {
      try {
        const headers: Record<string, string> = {};
        if (activeTab === "global") {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        }

        const endpoint =
          activeTab === "daily"
            ? `/api/leaderboard?date=${gameDate}&type=daily`
            : `/api/leaderboard?type=global`;

        const res = await fetch(endpoint, { headers });
        const data = await res.json();
        const rawEntries: LeaderboardEntry[] = data.leaderboard || [];
        const topEntries = rawEntries
          .filter((entry) => {
            const name = (entry.profiles?.display_name || entry.anon_name || "").toLowerCase();
            return !["bogdan besliu", "bogdanbesliu", "bogdan"].some((ignored) =>
              name === ignored || name.includes(ignored)
            );
          })
          .slice(0, 20);
        setEntries(topEntries);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, gameDate, activeTab, onClose, supabase]);

  const handleTablistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextTab = activeTab === "daily" ? "global" : "daily";
      setActiveTab(nextTab);
      const targetId = nextTab === "daily" ? "tab-daily" : "tab-global";
      document.getElementById(targetId)?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]"
      >
        <button
          onClick={onClose}
          aria-label="Close leaderboard modal"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 id="leaderboard-modal-title" className="text-lg font-extrabold text-slate-100">
            Leaderboards
          </h2>
        </div>

        {/* View switcher: Daily Leaderboard vs All-Time Hall of Fame */}
        <div
          role="tablist"
          aria-label="Leaderboard views"
          onKeyDown={handleTablistKeyDown}
          className="flex items-center gap-2 mb-4"
        >
          <button
            type="button"
            role="tab"
            id="tab-daily"
            aria-selected={activeTab === "daily"}
            aria-controls="leaderboard-content"
            tabIndex={activeTab === "daily" ? 0 : -1}
            onClick={() => setActiveTab("daily")}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              activeTab === "daily"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-slate-300 hover:text-slate-100 bg-slate-950/50 border border-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Daily Leaderboard</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-global"
            aria-selected={activeTab === "global"}
            aria-controls="leaderboard-content"
            tabIndex={activeTab === "global" ? 0 : -1}
            onClick={() => setActiveTab("global")}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              activeTab === "global"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-slate-300 hover:text-slate-100 bg-slate-950/50 border border-slate-800"
            }`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            <span>All-Time Hall of Fame</span>
          </button>
        </div>

        {/* Tab content panel */}
        <div
          id="leaderboard-content"
          role="tabpanel"
          aria-labelledby={activeTab === "daily" ? "tab-daily" : "tab-global"}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          {/* Guest Callout Banner - Displayed on Global tab for unregistered visitors */}
          {activeTab === "global" && !isLoggedIn && (
            <aside
              aria-label="Hall of Fame membership"
              className="mb-3 p-3.5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 shadow-lg relative overflow-hidden flex-shrink-0"
            >
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"
              />

              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                    Walk of Fame
                  </span>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                    Want your name up in lights?
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                    Guest scores reset daily. Sign in with Google to bank career points, defend daily streaks, and rank among the top cinephiles.
                  </p>
                </div>

                {onLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogin();
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <LogIn className="w-4 h-4 text-slate-950" aria-hidden="true" />
                    <span>Sign in with Google — It&apos;s Free</span>
                  </button>
                )}

                <p className="text-[10px] text-slate-400 text-center font-medium">
                  ⚡ 1-click sign in • Instant rank activation
                </p>
              </div>
            </aside>
          )}

          {/* List or Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-300 my-auto">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" aria-hidden="true" />
              <span className="font-medium text-xs">Loading top 20 rankings...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-slate-300 text-xs px-4 my-auto">
              {activeTab === "daily"
                ? "No scores registered yet for today. Solve today's movie to claim #1!"
                : "No registered user scores recorded yet. Be the first to sign in and claim #1!"}
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
              {entries.map((entry, index) => {
                const displayName =
                  entry.profiles?.display_name || entry.anon_name || "Cinephile";
                const isCurrentUser =
                  Boolean(currentUserId && entry.user_id && entry.user_id === currentUserId);

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                      isCurrentUser
                        ? "bg-amber-500/10 border border-amber-500/50 shadow-sm"
                        : "bg-slate-950/70 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-bold text-slate-300 flex-shrink-0">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : `#${index + 1}`}
                    </span>

                    {entry.profiles?.avatar_url ? (
                      <img
                        src={entry.profiles.avatar_url}
                        alt={`${displayName}'s avatar`}
                        className="w-8 h-8 rounded-full object-cover border border-amber-400/60 flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700"
                        aria-hidden="true"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Row 1: Player name and optional (You) badge */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>

                      {/* Row 2: Time, clues/games, and points */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        {activeTab === "daily" && entry.created_at && (
                          <>
                            <span>
                              {new Date(entry.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-slate-600" aria-hidden="true">
                              •
                            </span>
                          </>
                        )}
                        <span className="text-slate-300 font-medium">
                          {activeTab === "daily"
                            ? `${entry.clues_used}/40 clues`
                            : `${entry.clues_used} ${entry.clues_used === 1 ? "game" : "games"}`}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">
                          •
                        </span>
                        <span className="font-bold text-amber-400">
                          {entry.score} pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
