import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Puzzle Archive — 40Clues Cinema",
  description: "Browse and play past daily movie deduction puzzles from the 40Clues archive.",
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
