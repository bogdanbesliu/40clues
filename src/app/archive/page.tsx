import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Film } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Puzzle Archive — 40Clues Cinema",
  description: "Browse and play past daily movie deduction puzzles from the 40Clues archive.",
};

export default async function ArchivePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data: games } = await supabase
    .from("daily_games")
    .select("id, game_date, year")
    .lte("game_date", today)
    .order("game_date", { ascending: false });

  const pastGames = games || [];

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 font-sans">
      <div className="max-w-xl w-full flex flex-col gap-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Today's Puzzle</span>
          </Link>
        </div>

        {/* Title Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Calendar className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">Puzzle Archive</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Every past daily movie deduction puzzle, available to play anytime
            </p>
          </div>
        </div>

        {/* Puzzles List */}
        <div className="flex flex-col gap-3">
          {pastGames.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No past puzzles available yet.
            </div>
          ) : (
            pastGames.map((game) => {
              const isToday = game.game_date === today;
              const decade = game.year ? `${Math.floor(Number(game.year) / 10) * 10}s` : null;

              return (
                <Link
                  key={game.id || game.game_date}
                  href={`/?date=${game.game_date}`}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/40 transition-all flex items-center justify-between gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:border-amber-500/40 group-hover:text-amber-400 transition-colors">
                      <Film className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm group-hover:text-amber-300 transition-colors">
                          {formatDate(game.game_date)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {decade ? `Mystery Film from the ${decade}` : "40 Clues Cinema Puzzle"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                    <span>Play</span>
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-900 text-center text-xs text-slate-400">
          © 40Clues 2026 • Cinema Deduction Game
        </div>
      </div>
    </main>
  );
}
