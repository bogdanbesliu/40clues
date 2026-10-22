import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://40clues.com"),
  title: "40clues.com (Guess the movie in 40 clues!)",
  description:
    "40 clues. One movie. Test your film knowledge daily with 40 randomized witty clues. Can you deduce today's secret film?",
  keywords: [
    "movie trivia",
    "wordle for movies",
    "film game",
    "daily puzzle",
    "40 clues",
    "cinema quiz",
    "40clues",
  ],
  authors: [{ name: "Bogdan Besliu" }],
  openGraph: {
    title: "40clues.com (Guess the movie in 40 clues!)",
    description:
      "40 randomized clues. From absurd background trivia to iconic quotes. Guess the movie in as few clues as possible!",
    url: "https://40clues.com",
    siteName: "40clues.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "40clues.com (Guess the movie in 40 clues!)",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "40clues.com (Guess the movie in 40 clues!)",
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
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between`}>
        {children}
        {/* Modulul de monitorizare activ */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}