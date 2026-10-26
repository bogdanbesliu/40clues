"use client";

import React, { useState, useEffect } from "react";
import { Clock, RefreshCw } from "lucide-react";

interface NextGameCountdownProps {
  onRefresh?: () => void;
}

export default function NextGameCountdown({ onRefresh }: NextGameCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    isReady: boolean;
  }>({
    hours: "00",
    minutes: "00",
    seconds: "00",
    isReady: false,
  });

  useEffect(() => {
    function calculateTime() {
      const now = new Date();
      // Next daily puzzle drops at UTC midnight
      const nextMidnight = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0,
          0
        )
      );

      const diffMs = nextMidnight.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00", isReady: true });
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
        isReady: false,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft.isReady) {
    return (
      <div className="flex items-center justify-between gap-3 w-full p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-bold text-emerald-200">
            A new mystery film is ready!
          </span>
        </div>
        <button
          type="button"
          onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Play Now</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`Next daily mystery movie drops in ${timeLeft.hours} hours and ${timeLeft.minutes} minutes`}
      className="flex flex-col items-center justify-center gap-1.5 py-3 px-4 bg-slate-950/80 border border-slate-800 rounded-xl w-full shadow-inner"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400">
        <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
        <span>Next Mystery Movie Drops In</span>
      </div>

      <div
        aria-hidden="true"
        className="flex items-center gap-2 text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-wider"
      >
        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
          {timeLeft.hours}h
        </span>
        <span className="text-slate-600">:</span>
        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
          {timeLeft.minutes}m
        </span>
        <span className="text-slate-600">:</span>
        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
          {timeLeft.seconds}s
        </span>
      </div>
    </div>
  );
}
