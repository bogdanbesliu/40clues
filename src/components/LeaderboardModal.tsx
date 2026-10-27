"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, Loader2, User, Globe, Clock, Lock, LogIn } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

interface LeaderboardEntry {
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

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // If viewing Global tab without being signed in, do not fetch
    if (activeTab === "global" && !isLoggedIn) {
      setLoading(false);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

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
        const topEntries = (data.leaderboard || []).slice(0, 20);
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
    };
  }, [isOpen, gameDate, activeTab, isLoggedIn, onClose, supabase]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          aria-label="Close leaderboard modal"
          className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 id="leaderboard-modal-title" className="text-lg font-extrabold text-slate-100">Leaderboards</h2>
        </div>

        {/* View switcher: Daily Leaderboard vs Global Leaderboards */}
        <div role="tablist" aria-label="Leaderboard views" className="flex items-center gap-2 mb-5">
          <button
            type="button"
            role="tab"
            id="tab-daily"
            aria-selected={activeTab === "daily"}
            aria-controls="leaderboard-content"
            onClick={() => setActiveTab("daily")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === "daily"
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
            onClick={() => setActiveTab("global")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeTab === "global"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-slate-300 hover:text-slate-100 bg-slate-950/50 border border-slate-800"
              }`}
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Global Leaderboards</span>
            {!isLoggedIn && (
              <Lock className="w-3 h-3 text-amber-400 ml-0.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {activeTab === "global" && !isLoggedIn ? (
          <div
            id="leaderboard-content"
            role="tabpanel"
            aria-labelledby="tab-global"
            className="flex flex-col items-center justify-center text-center py-8 px-4 bg-slate-950/60 border border-amber-500/30 rounded-2xl gap-4 my-auto animate-in fade-in duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Members Only Feature
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Global All-Time Leaderboards track cumulative scores and career streaks across all daily mysteries. Sign in to view rankings and claim your spot!
              </p>
            </div>
            {onLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogin();
                }}
                className="w-full max-w-xs min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In to View Rankings</span>
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" aria-hidden="true" />
            <span className="font-medium text-xs">Loading top 20 rankings...</span>
          </div>
        ) : entries.length === 0 ? (
          <div
            id="leaderboard-content"
            role="tabpanel"
            aria-labelledby={activeTab === "daily" ? "tab-daily" : "tab-global"}
            className="text-center py-12 text-slate-300 text-xs px-4"
          >
            {activeTab === "daily"
              ? "No scores registered yet for today. Solve today's movie to claim #1!"
              : "No registered user scores recorded yet. Sign in with Google to join Global Leaderboards!"}
          </div>
        ) : (
          <div
            id="leaderboard-content"
            role="tabpanel"
            aria-labelledby={activeTab === "daily" ? "tab-daily" : "tab-global"}
            className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1"
          >
            {entries.map((entry, index) => {
              const displayName =
                entry.profiles?.display_name || entry.anon_name || "Cinephile_Guest";
              const isRegistered = Boolean(entry.profiles?.display_name);

              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-xl hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center text-xs font-bold text-slate-300">
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
                        className="w-7 h-7 rounded-full object-cover border border-amber-400/60 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700" aria-hidden="true">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-100 truncate max-w-[130px] sm:max-w-[160px]">
                          {displayName}
                        </span>
                        {!isRegistered && activeTab === "daily" && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold">
                            Guest
                          </span>
                        )}
                      </div>
                      {activeTab === "daily" && entry.created_at && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(entry.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-right flex-shrink-0">
                    <span className="text-[11px] text-slate-300 font-medium">
                      {activeTab === "daily"
                        ? `${entry.clues_used}/40 clues`
                        : `${entry.clues_used} ${entry.clues_used === 1 ? "game" : "games"}`}
                    </span>
                    <span className="text-xs font-bold text-amber-400 min-w-[55px] text-right">
                      {entry.score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}