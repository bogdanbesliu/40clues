"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, HelpCircle, Trophy, RefreshCw, AlertCircle } from "lucide-react";
import { TODAY_MOCK_GAME } from "../data/todayGame";

export default function Home() {
  const game = TODAY_MOCK_GAME;
  const [clueIndex, setClueIndex] = useState<number>(0);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [message, setMessage] = useState("");

  const calculateScore = (cluesUsed: number) => {
    return Math.max(25, 1000 - (cluesUsed - 1) * 25);
  };

  const getRankBadge = (cluesCount: number) => {
    if (cluesCount <= 3) return "🎯 Cinephile Psychic";
    if (cluesCount <= 10) return "🍿 Film Buff";
    if (cluesCount <= 25) return "🎟️ Casual Viewer";
    if (cluesCount <= 39) return "🕵️ Desperate Detective";
    return "🪢 By the Skin of Your Teeth";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || hasWon || hasLost) return;

    const cleanGuess = guess.trim().toLowerCase();
    const cleanTarget = game.title.toLowerCase();
    const newAttempts = [guess.trim(), ...attempts];
    setAttempts(newAttempts);

    if (cleanGuess === cleanTarget) {
      setHasWon(true);
      setMessage("Correct! Brilliant deduction!");
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } else {
      if (clueIndex + 1 < game.clues.length) {
        setClueIndex((prev) => prev + 1);
        setMessage("Incorrect! Next clue unlocked.");
      } else {
        setHasLost(true);
        setMessage(`Game over! The movie was: ${game.title} (${game.year})`);
      }
    }
    setGuess("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 font-sans">
      {/* Header */}
      <header className="max-w-xl w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            40Clues
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Cinema Edition</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Clue {clueIndex + 1} / 40</span>
        </div>
      </header>

      {/* Main Game Container */}
      <div className="max-w-xl w-full flex flex-col gap-6">
        {/* Active Clue Card */}
        <div className="relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" /> Clue #{clueIndex + 1}
            </span>
            <span>Current Potential: {calculateScore(clueIndex + 1)} pts</span>
          </div>
          <p className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed italic">
            "{game.clues[clueIndex]}"
          </p>
        </div>

        {/* Status Alert */}
        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium text-center transition-all ${
              hasWon
                ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
                : hasLost
                ? "bg-rose-950/80 border border-rose-800 text-rose-300"
                : "bg-slate-900 border border-slate-800 text-slate-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Input Form */}
        {!hasWon && !hasLost ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Guess the movie title..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              autoFocus
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Guess
            </button>
          </form>
        ) : (
          /* Victory / Defeat Card */
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center flex flex-col items-center gap-3">
            <Trophy className={`w-12 h-12 ${hasWon ? "text-amber-400" : "text-slate-600"}`} />
            <h3 className="text-2xl font-bold">
              {hasWon ? "Movie Solved!" : "Better Luck Tomorrow!"}
            </h3>
            <p className="text-sm text-slate-400">
              Title: <strong className="text-slate-200">{game.title} ({game.year})</strong>
            </p>
            {hasWon && (
              <div className="flex flex-col gap-1 items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800 w-full">
                <span className="text-xs text-slate-400">Final Score</span>
                <span className="text-2xl font-extrabold text-amber-400">
                  {calculateScore(clueIndex + 1)} pts
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  {getRankBadge(clueIndex + 1)}
                </span>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replay demo
            </button>
          </div>
        )}

        {/* Guess History */}
        {attempts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Previous guesses ({attempts.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {attempts.map((attempt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-lg text-sm flex items-center justify-between text-slate-400"
                >
                  <span>{attempt}</span>
                  <span className="text-xs text-rose-400/80">Incorrect</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}