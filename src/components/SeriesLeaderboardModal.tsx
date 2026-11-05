"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Trophy, Loader2, User, Globe, Clock, LogIn, Sparkles, Tv } from "lucide-react";
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

interface SeriesLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameDate: string;
  isLoggedIn?: boolean;
  onLogin?: () => void;
}

export default function SeriesLeaderboardModal({
  isOpen,
  onClose,
  gameDate,
  isLoggedIn = false,
  onLogin,
}: SeriesLeaderboardModalProps) {
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

  useEffect(() => {
    if (isOpen) {
      setActiveTab("daily");
    }
  }, [isOpen]);

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
            ? `/api/series/leaderboard?date=${gameDate}&type=daily`
            : `/api/series/leaderboard?type=global`;

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
  }, [isOpen, activeTab, gameDate, onClose, supabase]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-leaderboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Tv className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="series-leaderboard-title" className="text-lg sm:text-xl font-black text-slate-100">
                TV Leaderboard
              </h2>
              <p className="text-xs text-slate-400">Top TV detectives & binge savants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close leaderboard modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "daily"}
            onClick={() => setActiveTab("daily")}
            className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              activeTab === "daily"
                ? "bg-slate-800 text-amber-400 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Today&apos;s Board</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "global"}
            onClick={() => setActiveTab("global")}
            className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              activeTab === "global"
                ? "bg-slate-800 text-amber-400 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            <span>All-Time Hall of Fame</span>
          </button>
        </div>

        {/* Tab Context Banner */}
        <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
          <span>
            {activeTab === "daily"
              ? `Today's TV Series • ${gameDate}`
              : "Global TV detectives by total cumulative score"}
          </span>
          <span className="font-semibold text-slate-300">Top 20</span>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] divide-y divide-slate-800/60 rounded-xl border border-slate-800/80 bg-slate-950/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" aria-hidden="true" />
              <span className="text-xs">Fetching standings...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400 p-4 text-center">
              <Trophy className="w-8 h-8 text-slate-400" aria-hidden="true" />
              <p className="text-xs font-medium text-slate-300">No TV detective scores logged yet.</p>
              <p className="text-[11px] text-slate-400">Be the first to solve today's TV puzzle!</p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isCurrentUser =
                Boolean(currentUserId) && Boolean(entry.user_id) && entry.user_id === currentUserId;
              const displayName =
                entry.profiles?.display_name || entry.anon_name || "TV Detective";
              const avatar = entry.profiles?.avatar_url;

              const rankDisplay =
                idx === 0
                  ? "🥇"
                  : idx === 1
                    ? "🥈"
                    : idx === 2
                      ? "🥉"
                      : `#${idx + 1}`;

              return (
                <div
                  key={`${entry.user_id || entry.anon_name || idx}-${idx}`}
                  className={`flex items-center justify-between p-2.5 sm:p-3 transition-colors ${
                    isCurrentUser
                      ? "bg-amber-500/10 border-l-4 border-amber-400 text-amber-200"
                      : "hover:bg-slate-800/40 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-xs font-black w-6 text-center flex-shrink-0 ${
                        idx < 3 ? "text-base" : "text-slate-400 font-mono"
                      }`}
                    >
                      {rankDisplay}
                    </span>

                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate max-w-[130px] sm:max-w-[160px] text-slate-100">
                          {displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {activeTab === "daily"
                          ? `${entry.clues_used} clue${entry.clues_used === 1 ? "" : "s"} used`
                          : `${entry.clues_used} games solved`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-black text-amber-400 text-xs sm:text-sm">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">PTS</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Guest conversion banner */}
        {!isLoggedIn && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span className="text-[11px] text-slate-300 truncate">
                Sign in to save your TV streak and join the Hall of Fame
              </span>
            </div>
            {onLogin && (
              <button
                onClick={onLogin}
                className="min-h-[44px] px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-all active:scale-95 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <LogIn className="w-3 h-3" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
