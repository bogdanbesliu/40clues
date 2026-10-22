"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Film, Loader2 } from "lucide-react";

interface MovieSuggestion {
  id: number;
  title: string;
  year: string;
  poster: string | null;
}

interface MovieSearchInputProps {
  onSelectMovie: (title: string) => void;
  disabled?: boolean;
}

export default function MovieSearchInput({ onSelectMovie, disabled }: MovieSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Căutare automată (debounce de 300ms)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Închide dropdown-ul dacă dai click în afara lui
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (title: string) => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    onSelectMovie(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex].title);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search and guess the movie title..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-10 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 absolute right-4" />
        )}
      </div>

      {/* Dropdown-ul cu rezultate */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => handleSelect(movie.title)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-slate-800/40 last:border-b-0 ${
                index === selectedIndex
                  ? "bg-amber-500/20 text-amber-200"
                  : "hover:bg-slate-800/70 text-slate-200"
              }`}
            >
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-8 h-12 object-cover rounded shadow-sm bg-slate-800 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-12 bg-slate-800 rounded flex items-center justify-center flex-shrink-0">
                  <Film className="w-4 h-4 text-slate-500" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate">{movie.title}</span>
                {movie.year && (
                  <span className="text-xs text-slate-400">{movie.year}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}