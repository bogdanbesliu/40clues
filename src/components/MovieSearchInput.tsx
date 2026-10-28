"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Film, Loader2, CornerDownLeft } from "lucide-react";

interface MovieSuggestion {
  id: number;
  title: string;
  year: string;
  poster: string | null;
}

interface MovieSearchInputProps {
  onSelectMovie: (title: string) => void;
  disabled?: boolean;
  isErrorShake?: boolean;
}

export default function MovieSearchInput({
  onSelectMovie,
  disabled,
  isErrorShake = false,
}: MovieSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results = data.results || [];
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelect = (title: string) => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelectMovie(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "Enter" && query.trim().length >= 2) {
        e.preventDefault();
        handleSelect(query.trim());
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex].title);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0].title);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative flex-1 transition-transform ${
        isErrorShake ? "animate-shake" : ""
      }`}
    >
      <div className="relative flex items-center">
        <label htmlFor="movie-search-input" className="sr-only">
          Search and guess the movie title
        </label>
        <Search
          className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="movie-search-input"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="movie-suggestions-list"
          aria-activedescendant={
            selectedIndex >= 0 ? `suggestion-${suggestions[selectedIndex]?.id}` : undefined
          }
          enterKeyHint="search"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search movie title (e.g. Inception)..."
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-12 pr-16 py-3.5 text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500 transition-all shadow-inner disabled:opacity-50"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Screen Reader Live Status for combobox suggestion count */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isOpen && suggestions.length > 0
            ? `${suggestions.length} movie suggestions available. Use arrow keys to navigate.`
            : ""}
        </div>

        <div className="absolute right-3.5 flex items-center gap-1.5 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" aria-hidden="true" />
          ) : query.length >= 2 ? (
            <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              <CornerDownLeft className="w-3 h-3" aria-hidden="true" /> Enter
            </span>
          ) : null}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="movie-suggestions-list"
          role="listbox"
          aria-label="Suggested movie titles"
          className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((movie, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={movie.id}
                id={`suggestion-${movie.id}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => handleSelect(movie.title)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 cursor-pointer text-left transition-colors border-b border-slate-800/60 last:border-b-0 min-h-[48px] ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-200"
                    : "hover:bg-slate-800/80 active:bg-slate-800 text-slate-200"
                }`}
              >
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt=""
                    aria-hidden="true"
                    className="w-7 h-10 object-cover rounded bg-slate-800 flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-7 h-10 bg-slate-800 rounded flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Film className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate text-slate-100">
                    {movie.title}
                  </span>
                  {movie.year && (
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? "text-amber-300" : "text-slate-400"
                      }`}
                    >
                      {movie.year}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
