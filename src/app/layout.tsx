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
    "40 randomized clues. One secret movie. Test your film knowledge daily from absurd background trivia to iconic quotes. Can you deduce today's film?",
  keywords: [
    "movie trivia",
    "wordle for movies",
    "film game",
    "daily puzzle",
    "40 clues",
    "cinema quiz",
    "40clues",
  ],
  authors: [{ name: "40Clues" }],
  openGraph: {
    title: "40clues.com (Guess the movie in 40 clues!)",
    description:
      "40 randomized clues. From absurd details to iconic quotes. Guess the movie in as few clues as possible!",
    url: "https://40clues.com",
    siteName: "40Clues",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "40clues.com (Guess the movie in 40 clues!)",
    description:
      "40 clues. One movie. Can you deduce today's secret film before running out of clues?",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "40Clues",
  applicationCategory: "GameApplication",
  genre: "Trivia / Deduction Game",
  browserRequirements: "Requires JavaScript",
  operatingSystem: "All",
  url: "https://40clues.com",
  description:
    "Daily cinema deduction trivia game. Guess the secret film from 40 randomized witty clues.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "40Clues",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}