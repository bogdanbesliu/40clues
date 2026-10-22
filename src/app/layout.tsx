import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://40clues.com"),
  title: "40Clues #Cinema — Daily Clue-by-Clue Movie Trivia",
  description:
    "40 clues. One movie. Test your film knowledge daily with 40 randomized witty clues. Can you deduce today's film?",
  keywords: [
    "movie trivia",
    "wordle for movies",
    "film game",
    "daily puzzle",
    "40 clues",
    "cinema quiz",
  ],
  authors: [{ name: "40Clues" }],
  openGraph: {
    title: "40Clues #Cinema 🎬 — Daily Movie Deduction Game",
    description:
      "40 randomized clues. From absurd background trivia to iconic quotes. Guess the movie in as few clues as possible!",
    url: "https://40clues.com",
    siteName: "40Clues",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "40Clues Cinema Edition - Daily Trivia",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "40Clues #Cinema 🎬 — Daily Movie Deduction Game",
    description:
      "40 clues. One movie. Can you deduce today's secret film before running out of clues?",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}