import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "40Clues: TV Series (Guess the TV show in 40 clues!)",
  description:
    "40 randomized clues. One secret television series. Test your TV knowledge daily from obscure pilot facts to iconic storylines and cliffhangers. Can you deduce today's show?",
  keywords: [
    "tv trivia",
    "wordle for tv shows",
    "television quiz",
    "daily tv puzzle",
    "40 clues series",
    "tv show game",
    "binge watcher game",
  ],
  alternates: {
    canonical: "https://40clues.com/series",
  },
  openGraph: {
    title: "40Clues: TV Series (Guess the TV show in 40 clues!)",
    description:
      "40 randomized clues. One secret television show. Deduce today's series from witty clues and iconic plot arcs!",
    url: "https://40clues.com/series",
    siteName: "40Clues",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "40Clues: TV Series (Guess the TV show in 40 clues!)",
    description:
      "40 clues. One secret TV series. Can you deduce today's television show before running out of clues?",
  },
};

export default function SeriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
