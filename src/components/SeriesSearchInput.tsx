"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Tv, Loader2, CornerDownLeft } from "lucide-react";

interface TvSuggestion {
  id: number;
  title: string;
  year: string;
  poster: string | null;
}

interface SeriesSearchInputProps {
  onSelectSeries: (title: string) => void;
  disabled?: boolean;
  isErrorShake?: boolean;
}

export default function SeriesSearchInput({
  onSelectSeries,
  disabled,
  isErrorShake = false,
}: SeriesSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TvSuggestion[]>([]);
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
        const res = await fetch(`/api/search?type=tv&q=${encodeURIComponent(query)}`);
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
    onSelectSeries(title);
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
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full max-w-md mx-auto transition-transform ${
        isErrorShake ? "animate-shake" : ""
      }`}
    >
      <div className="relative flex items-center">
        <label htmlFor="series-search-input" className="sr-only">
          Guess the television series title
        </label>
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" aria-hidden="true" />
          ) : (
            <Search className="w-5 h-5" aria-hidden="true" />
          )}
        </div>

        <input
          id="series-search-input"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          placeholder="Guess the TV show (e.g. Breaking Bad)..."
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="series-suggestions-list"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `series-option-${selectedIndex}` : undefined
          }
          className="w-full pl-11 pr-11 py-3.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus:border-transparent transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {query.trim().length >= 2 && !disabled && (
          <button
            onClick={() => handleSelect(query.trim())}
            aria-label="Submit TV series guess"
            className="absolute right-2.5 p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-w-[32px] min-h-[32px]"
          >
            <CornerDownLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="series-suggestions-list"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {suggestions.map((item, idx) => (
            <li
              key={`${item.id}-${idx}`}
              id={`series-option-${idx}`}
              role="option"
              aria-selected={selectedIndex === idx}
              onClick={() => handleSelect(item.title)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                selectedIndex === idx
                  ? "bg-amber-500/15 text-amber-200"
                  : "hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              {item.poster ? (
                <img
                  src={item.poster}
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-12 object-cover rounded shadow flex-shrink-0 bg-slate-800"
                />
              ) : (
                <div
                  className="w-8 h-12 bg-slate-800 rounded flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Tv className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="font-semibold text-sm truncate text-slate-100">
                  {item.title}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {item.year ? `Premiered in ${item.year}` : "TV Series"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
