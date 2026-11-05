"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Film,
  Tv,
  Flame,
  HelpCircle,
  Trophy,
  Calendar,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Shield,
  ArrowRight,
} from "lucide-react";

export type EditionType = "cinema" | "series";

export interface HeaderUser {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

export interface HeaderNavigationProps {
  /** The current active edition: Cinema or TV Series */
  edition: EditionType;
  /** Active authenticated user or null */
  user?: HeaderUser | null;
  /** Current streak count */
  streak?: number;
  /** Callback to open How to Play modal */
  onOpenHowToPlay: () => void;
  /** Callback to open Leaderboard modal */
  onOpenLeaderboard: () => void;
  /** Optional callback to open Archive modal (if on Cinema); links to /archive if omitted */
  onOpenArchive?: () => void;
  /** Callback to open Feedback modal */
  onOpenFeedback: () => void;
  /** Callback to sign out */
  onSignOut: () => Promise<void> | void;
  /** Callback to sign in with Google */
  onGoogleLogin: () => Promise<void> | void;
  /** First-time user badge indicator */
  showPing?: boolean;
  /** Optional container max-width class override (defaults to "max-w-2xl") */
  containerClassName?: string;
}

export default function HeaderNavigation({
  edition,
  user,
  streak = 0,
  onOpenHowToPlay,
  onOpenLeaderboard,
  onOpenArchive,
  onOpenFeedback,
  onSignOut,
  onGoogleLogin,
  showPing = false,
  containerClassName = "max-w-2xl",
}: HeaderNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const menuTriggerBtnRef = useRef<HTMLButtonElement>(null);

  const isCinema = edition === "cinema";

  // Edition-specific theme tokens
  const activeFocusRing = isCinema
    ? "focus-visible:ring-amber-400"
    : "focus-visible:ring-sky-400";

  // Close desktop dropdown on click outside or Escape
  useEffect(() => {
    if (!isDesktopDropdownOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(e.target as Node) &&
        menuTriggerBtnRef.current &&
        !menuTriggerBtnRef.current.contains(e.target as Node)
      ) {
        setIsDesktopDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDesktopDropdownOpen(false);
        menuTriggerBtnRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDesktopDropdownOpen]);

  // Lock body scroll and manage focus trapping for mobile drawer
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const triggerBtn = menuTriggerBtnRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element inside the drawer
    const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        triggerBtn?.focus();
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
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerBtn?.focus();
    };
  }, [isMobileMenuOpen]);

  const handleMenuTriggerClick = () => {
    // If screen is mobile (< 640px), open drawer. Otherwise toggle desktop dropdown.
    if (window.innerWidth < 640) {
      setIsMobileMenuOpen(true);
    } else {
      setIsDesktopDropdownOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* Sticky Header with Backdrop Blur */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 transition-colors">
        <div
          className={`${containerClassName} mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3`}
        >
          {/* Brand Logo & Edition Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={isCinema ? "/" : "/series"}
              className={`flex items-center gap-2.5 group rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 ${activeFocusRing} transition-transform active:scale-95`}
              aria-label={
                isCinema
                  ? "40Clues Cinema Edition - Daily Mystery Movie Game"
                  : "40Clues TV Series Edition - Daily Mystery Television Game"
              }
            >
              {/* Brand Icon Badge */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-105 ${
                  isCinema
                    ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-amber-500/20 text-slate-950"
                    : "bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600 shadow-sky-500/20 text-slate-950"
                }`}
              >
                {isCinema ? (
                  <Film
                    className="w-5 h-5 text-slate-950 stroke-[2.2]"
                    aria-hidden="true"
                  />
                ) : (
                  <Tv
                    className="w-5 h-5 text-slate-950 stroke-[2.2]"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col min-w-0">
                <span
                  className={`font-black text-lg sm:text-xl tracking-tight leading-none bg-clip-text text-transparent truncate ${
                    isCinema
                      ? "bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400"
                      : "bg-gradient-to-r from-sky-200 via-cyan-300 to-blue-400"
                  }`}
                >
                  40Clues
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mt-0.5 truncate ${
                    isCinema ? "text-amber-300/90" : "text-sky-300/90"
                  }`}
                >
                  {isCinema ? "Cinema Edition" : "TV Series Edition"}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action Cluster (Streamlined & Uncluttered) */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Win Streak Indicator */}
            {streak > 0 && (
              <div
                aria-label={`${streak} day win streak`}
                className={`min-h-[44px] px-3 flex items-center justify-center gap-1.5 text-xs font-bold rounded-full border shadow-sm ${
                  isCinema
                    ? "text-amber-300 bg-amber-950/70 border-amber-800/80"
                    : "text-sky-300 bg-sky-950/70 border-sky-800/80"
                }`}
                title={`${streak}-day active win streak`}
              >
                <Flame
                  className={`w-3.5 h-3.5 ${
                    isCinema
                      ? "fill-amber-400 text-amber-400"
                      : "fill-sky-400 text-sky-400"
                  }`}
                  aria-hidden="true"
                />
                <span>{streak}</span>
              </div>
            )}

            {/* How to Play Button */}
            <button
              type="button"
              onClick={onOpenHowToPlay}
              className={`relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ${
                isCinema
                  ? "hover:text-amber-400 focus-visible:ring-amber-400"
                  : "hover:text-sky-400 focus-visible:ring-sky-400"
              }`}
              title="How to Play & Rules"
              aria-label="How to Play"
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              {showPing && (
                <span
                  className="absolute -top-1 -right-1 flex h-3 w-3"
                  aria-hidden="true"
                >
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isCinema ? "bg-amber-400" : "bg-sky-400"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isCinema ? "bg-amber-500" : "bg-sky-500"
                    }`}
                  ></span>
                </span>
              )}
            </button>

            {/* Leaderboards Button */}
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ${
                isCinema
                  ? "text-amber-400 hover:bg-slate-800 focus-visible:ring-amber-400"
                  : "text-sky-400 hover:bg-slate-800 focus-visible:ring-sky-400"
              }`}
              title="Leaderboards & Rankings"
              aria-label="Leaderboards"
            >
              <Trophy className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Consolidated Dropdown Trigger Button */}
            <div className="relative">
              <button
                ref={menuTriggerBtnRef}
                type="button"
                onClick={handleMenuTriggerClick}
                className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ${activeFocusRing} ${
                  isDesktopDropdownOpen
                    ? isCinema
                      ? "border-amber-500/60 ring-2 ring-amber-400/40"
                      : "border-sky-500/60 ring-2 ring-sky-400/40"
                    : ""
                }`}
                title="Open menu"
                aria-label="Open menu and account options"
                aria-haspopup="menu"
                aria-expanded={isDesktopDropdownOpen || isMobileMenuOpen}
                aria-controls="desktop-header-dropdown"
              >
                {user ? (
                  <div className="flex items-center gap-2">
                    {user.user_metadata?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.user_metadata.avatar_url}
                        alt=""
                        aria-hidden="true"
                        className={`w-6 h-6 rounded-full border object-cover ${
                          isCinema ? "border-amber-400/80" : "border-sky-400/80"
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                          isCinema
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-sky-500/20 text-sky-400"
                        }`}
                        aria-hidden="true"
                      >
                        {(user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[80px] truncate">
                      {user.user_metadata?.full_name?.split(" ")[0] || "Profile"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Menu className="w-4 h-4 text-slate-300" aria-hidden="true" />
                    <span className="hidden sm:inline text-xs font-bold text-slate-200">
                      Menu
                    </span>
                  </div>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isDesktopDropdownOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Desktop Floating Dropdown Menu */}
              {isDesktopDropdownOpen && (
                <div
                  ref={desktopDropdownRef}
                  id="desktop-header-dropdown"
                  role="menu"
                  aria-label="Header navigation options"
                  className="hidden sm:flex flex-col absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Edition Switcher Section */}
                  <div className="p-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1 block">
                      Switch Game Edition
                    </span>
                    {isCinema ? (
                      <Link
                        href="/series"
                        role="menuitem"
                        onClick={() => setIsDesktopDropdownOpen(false)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-sky-950/30 border border-slate-800 hover:border-sky-500/40 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Tv className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">
                                TV Series Edition
                              </span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                NEW
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Daily mystery television shows
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      <Link
                        href="/"
                        role="menuitem"
                        onClick={() => setIsDesktopDropdownOpen(false)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Film className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
                              Cinema Edition
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Daily mystery feature movies
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                          aria-hidden="true"
                        />
                      </Link>
                    )}
                  </div>

                  {/* Cinema Archive Option */}
                  {isCinema && (
                    <div className="px-1.5 py-1">
                      {onOpenArchive ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsDesktopDropdownOpen(false);
                            onOpenArchive();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-slate-200 hover:bg-slate-800/80 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              className="w-4 h-4 text-amber-400"
                              aria-hidden="true"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
                                Puzzle Archive
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Play past daily movies
                              </p>
                            </div>
                          </div>
                          <ArrowRight
                            className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <Link
                          href="/archive"
                          role="menuitem"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-slate-200 hover:bg-slate-800/80 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <div className="flex items-center gap-2.5">
                            <Calendar
                              className="w-4 h-4 text-amber-400"
                              aria-hidden="true"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 block">
                                Puzzle Archive
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Play past daily movies
                              </p>
                            </div>
                          </div>
                          <ArrowRight
                            className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="my-1 border-t border-slate-800/80" />

                  {/* Auth / Account Section */}
                  <div className="p-1.5">
                    {user ? (
                      <div className="flex flex-col gap-1.5">
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setIsDesktopDropdownOpen(false)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-colors group focus:outline-none focus-visible:ring-2 ${activeFocusRing}`}
                        >
                          <User
                            className={`w-4 h-4 ${
                              isCinema ? "text-amber-400" : "text-sky-400"
                            }`}
                            aria-hidden="true"
                          />
                          <div className="text-left min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white block truncate">
                              {user.user_metadata?.full_name ||
                                user.email?.split("@")[0] ||
                                "My Profile"}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              View career stats & badges
                            </span>
                          </div>
                        </Link>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsDesktopDropdownOpen(false);
                            onSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs font-semibold">Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 p-1">
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-200 block">
                            Guest Detective
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Sign in to save progress and join leaderboards.
                          </span>
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsDesktopDropdownOpen(false);
                            onGoogleLogin();
                          }}
                          className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus-visible:ring-2 ${
                            isCinema
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 focus-visible:ring-amber-300"
                              : "bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 focus-visible:ring-sky-300"
                          }`}
                        >
                          <LogIn className="w-4 h-4 text-slate-950" aria-hidden="true" />
                          <span>Sign In with Google</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-slate-800/80" />

                  {/* Feedback & Privacy */}
                  <div className="px-1.5 py-1 flex items-center justify-between text-[11px] text-slate-400">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsDesktopDropdownOpen(false);
                        onOpenFeedback();
                      }}
                      className="px-2 py-1 rounded hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                      <span>Feedback</span>
                    </button>
                    <Link
                      href="/privacy"
                      role="menuitem"
                      onClick={() => setIsDesktopDropdownOpen(false)}
                      className="px-2 py-1 rounded hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex items-center gap-1"
                    >
                      <Shield className="w-3 h-3 text-slate-500" aria-hidden="true" />
                      <span>Privacy</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Accessible Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`${isCinema ? "Cinema" : "TV Series"} edition navigation menu`}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end motion-safe:animate-in motion-safe:fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            ref={mobileMenuRef}
            className="bg-slate-900 border-l border-slate-800 w-full max-w-xs h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto motion-safe:animate-in motion-safe:slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-950 font-black ${
                      isCinema
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : "bg-gradient-to-br from-sky-400 to-blue-500"
                    }`}
                  >
                    {isCinema ? (
                      <Film className="w-4 h-4 text-slate-950" aria-hidden="true" />
                    ) : (
                      <Tv className="w-4 h-4 text-slate-950" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-lg font-black bg-clip-text text-transparent block leading-tight ${
                        isCinema
                          ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                          : "bg-gradient-to-r from-sky-300 via-cyan-400 to-blue-500"
                      }`}
                    >
                      40Clues
                    </span>
                    <p
                      className={`text-[10px] uppercase tracking-wider font-bold ${
                        isCinema ? "text-amber-300" : "text-sky-300"
                      }`}
                    >
                      {isCinema ? "Cinema Edition" : "TV Series Edition"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 ${activeFocusRing}`}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Mobile Edition Switcher Segment */}
              <div className="flex flex-col gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
                  Choose Game Edition
                </span>
                <div className="grid grid-cols-2 gap-1 p-0.5">
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isCinema ? "page" : undefined}
                    className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isCinema
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>Cinema</span>
                  </Link>

                  <Link
                    href="/series"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={!isCinema ? "page" : undefined}
                    className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      !isCinema
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                    <span>TV Series</span>
                  </Link>
                </div>
              </div>

              {/* User Card or Guest Sign-In */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      {user.user_metadata?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.user_metadata.avatar_url}
                          alt=""
                          aria-hidden="true"
                          className={`w-10 h-10 rounded-full border object-cover ${
                            isCinema ? "border-amber-400/80" : "border-sky-400/80"
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm ${
                            isCinema
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-sky-500/20 text-sky-400"
                          }`}
                          aria-hidden="true"
                        >
                          {(user.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {user.user_metadata?.full_name ||
                            user.email?.split("@")[0] ||
                            "Detective"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex-1 min-h-[44px] py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 ${activeFocusRing}`}
                      >
                        <User
                          className={`w-3.5 h-3.5 ${
                            isCinema ? "text-amber-400" : "text-sky-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span>Profile & Stats</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onSignOut();
                        }}
                        className="min-h-[44px] py-2 px-3 bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        aria-label="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <User
                        className={`w-4 h-4 ${
                          isCinema ? "text-amber-400" : "text-sky-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>Guest Detective</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sign in to track win streaks, access past archives, and climb
                      global leaderboards!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onGoogleLogin();
                      }}
                      className={`w-full min-h-[44px] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ${
                        isCinema
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 focus-visible:ring-amber-300"
                          : "bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 focus-visible:ring-sky-300"
                      }`}
                    >
                      <LogIn className="w-4 h-4 text-slate-950" aria-hidden="true" />
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <nav aria-label="Mobile Navigation Links" className="flex flex-col gap-2">
                {/* Cinema Puzzle Archive Option */}
                {isCinema && (
                  <>
                    {onOpenArchive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenArchive();
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                              Puzzle Archive
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Play past cinema mysteries
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 text-slate-400 group-hover:text-amber-400"
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <Link
                        href="/archive"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                              Puzzle Archive
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Play past cinema mysteries
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          className="w-4 h-4 text-slate-400 group-hover:text-amber-400"
                          aria-hidden="true"
                        />
                      </Link>
                    )}
                  </>
                )}

                {/* How to Play */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenHowToPlay();
                  }}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/70 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 ${activeFocusRing}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:text-amber-400 transition-colors">
                      <HelpCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                        How to Play
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Rules, lifelines & scoring
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-amber-400"
                    aria-hidden="true"
                  />
                </button>

                {/* Leaderboards */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenLeaderboard();
                  }}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/70 flex items-center justify-between text-left transition-all group focus:outline-none focus-visible:ring-2 ${activeFocusRing}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isCinema
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400"
                      }`}
                    >
                      <Trophy className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                        {isCinema ? "Cinema Leaderboard" : "TV Leaderboard"}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Daily and all-time rankings
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-amber-400"
                    aria-hidden="true"
                  />
                </button>
              </nav>
            </div>

            {/* Drawer Footer Links */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenFeedback();
                }}
                className="p-2 -m-2 min-h-[44px] flex items-center hover:text-amber-400 transition-colors underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
              >
                Feedback
              </button>
              <Link
                href="/privacy"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -m-2 min-h-[44px] flex items-center hover:text-amber-400 transition-colors underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
