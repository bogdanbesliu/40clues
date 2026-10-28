"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  clueNumber: number;
  totalClues: number;
  streak: number;
  rankBadge: string;
  movieTitle: string;
  movieYear: number | string;
  hasWon: boolean;
  gameDate: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const c = ctx as any;
  if (typeof c.roundRect === "function") {
    c.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export default function ShareModal({
  isOpen,
  onClose,
  score,
  clueNumber,
  totalClues,
  streak,
  rankBadge,
  movieTitle,
  movieYear,
  hasWon,
  gameDate,
}: ShareModalProps) {
  const [includeSpoiler, setIncludeSpoiler] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const [hasCopiedImage, setHasCopiedImage] = useState(false);
  const [canMobileShare, setCanMobileShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  // Check if browser supports Web Share API without triggering TS2774
  useEffect(() => {
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (
      nav &&
      typeof nav.share === "function" &&
      typeof nav.canShare === "function"
    ) {
      setCanMobileShare(true);
    }
  }, []);

  // Generate canvas card
  useEffect(() => {
    if (!isOpen) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, "#090d16");
    bgGrad.addColorStop(0.5, "#020617");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Ambient top glow
    const glow = ctx.createRadialGradient(540, 150, 20, 540, 150, 480);
    glow.addColorStop(0, "rgba(245, 158, 11, 0.18)");
    glow.addColorStop(0.6, "rgba(239, 68, 68, 0.08)");
    glow.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 700);

    // 3. Card inner border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 980, 980);

    // 4. Header title: "40Clues"
    ctx.textAlign = "center";
    ctx.font = "900 78px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const titleGrad = ctx.createLinearGradient(350, 0, 730, 0);
    titleGrad.addColorStop(0, "#FBBF24");
    titleGrad.addColorStop(0.5, "#F97316");
    titleGrad.addColorStop(1, "#EF4444");
    ctx.fillStyle = titleGrad;
    ctx.fillText("40Clues", 540, 160);

    // Subtitle & Date
    ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#94A3B8";
    const dateLabel = gameDate ? `CINEMA EDITION • ${gameDate.toUpperCase()}` : "CINEMA EDITION";
    ctx.fillText(dateLabel, 540, 205);

    // 5. Rank Badge Pill
    const badgeText = hasWon ? rankBadge : "🎬 Cinema Enthusiast";
    ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 60;
    const badgeX = 540 - badgeWidth / 2;

    ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, 245, badgeWidth, 54, 27);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDE68A";
    ctx.fillText(badgeText, 540, 282);

    // 6. Stats Grid (3 boxes: Score, Clues Used, Streak)
    const statBoxes = [
      { label: "FINAL SCORE", value: hasWon ? `${score} pts` : "0 pts", color: "#FBBF24" },
      { label: "CLUES USED", value: `${clueNumber} / ${totalClues}`, color: "#F1F5F9" },
      { label: "WIN STREAK", value: `${streak} 🔥`, color: "#FB923C" },
    ];

    const boxWidth = 280;
    const boxHeight = 150;
    const gap = 30;
    const startX = (1080 - (boxWidth * 3 + gap * 2)) / 2;
    const boxY = 340;

    statBoxes.forEach((stat, i) => {
      const bx = startX + i * (boxWidth + gap);
      // Box background
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawRoundedRect(ctx, bx, boxY, boxWidth, boxHeight, 20);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#94A3B8";
      ctx.fillText(stat.label, bx + boxWidth / 2, boxY + 48);

      // Value
      ctx.font = "900 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.value, bx + boxWidth / 2, boxY + 112);
    });

    // 7. Visual Clue Progression Grid (5 large score blocks)
    const blocksCount = Math.min(5, Math.ceil(clueNumber / 8));
    const greenCount = hasWon ? Math.max(1, 6 - blocksCount) : 0;
    const blockWidth = 90;
    const blockGap = 18;
    const totalBlockWidth = 5 * blockWidth + 4 * blockGap;
    const blockStartX = (1080 - totalBlockWidth) / 2;
    const blockY = 540;

    for (let b = 0; b < 5; b++) {
      const bx = blockStartX + b * (blockWidth + blockGap);
      const isGreen = b < greenCount;
      // High contrast for unrevealed blocks (>3.8:1 contrast border against #020617)
      ctx.fillStyle = isGreen ? "#10B981" : "#1E293B";
      ctx.strokeStyle = isGreen ? "#34D399" : "#64748B";
      ctx.lineWidth = 3;
      ctx.beginPath();
      drawRoundedRect(ctx, bx, blockY, blockWidth, blockWidth, 18);
      ctx.fill();
      ctx.stroke();
    }

    // 8. Mystery Movie Target Card
    const movieCardY = 680;
    const movieCardWidth = 840;
    const movieCardX = (1080 - movieCardWidth) / 2;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRect(ctx, movieCardX, movieCardY, movieCardWidth, 140, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText("TARGET SECRET FILM", 540, movieCardY + 45);

    ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#F8FAFC";
    if (includeSpoiler) {
      const fullTitle = `${movieTitle} (${movieYear})`;
      ctx.fillText(fullTitle, 540, movieCardY + 98);
    } else {
      ctx.fillStyle = "#94A3B8";
      ctx.fillText("🔒 [Solved • Spoiler Protected]", 540, movieCardY + 98);
    }

    // 9. Footer Call to Action
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#CBD5E1";
    ctx.fillText("Can you deduce today's secret film in 40 clues?", 540, 920);

    ctx.font = "800 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText("https://40clues.com", 540, 965);

    // Export to Blob
    canvas.toBlob((blob) => {
      if (blob) {
        setImageBlob(blob);
        setImageUrl(URL.createObjectURL(blob));
      }
    }, "image/png");

    canvasRef.current = canvas;
  }, [
    isOpen,
    includeSpoiler,
    score,
    clueNumber,
    totalClues,
    streak,
    rankBadge,
    movieTitle,
    movieYear,
    hasWon,
    gameDate,
  ]);

  if (!isOpen) return null;

  // Formatted classic text share
  const generateShareText = () => {
    const blocksCount = Math.min(5, Math.ceil(clueNumber / 8));
    const greenBlock = "🟩";
    const blackBlock = "⬛";
    const emojiGrid =
      greenBlock.repeat(Math.max(1, 6 - blocksCount)) +
      blackBlock.repeat(blocksCount - 1);
    const spoilerPart = includeSpoiler ? `\n🎬 Film: ${movieTitle} (${movieYear})` : "";
    return `40Clues #Cinema 🎬\n💡 ${clueNumber}/${totalClues} clues\n🏆 ${score} pts\n🔥 ${streak}-day streak\n${emojiGrid}${spoilerPart}\n\nhttps://40clues.com`;
  };

  const handleCopyText = () => {
    const text = generateShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2000);
    }
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `40clues-${gameDate || "today"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], `40clues-${gameDate || "today"}.png`, {
      type: "image/png",
    });

    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;

    try {
      if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "40Clues Cinema Result",
          text: generateShareText(),
        });
      } else if (nav && typeof nav.share === "function") {
        await nav.share({
          title: "40Clues Cinema Result",
          text: generateShareText(),
          url: "https://40clues.com",
        });
      } else {
        handleDownloadImage();
      }
    } catch (err: any) {
      // AbortError is triggered if user dismisses share drawer
      if (err.name !== "AbortError") {
        handleDownloadImage();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 id="share-modal-title" className="text-lg font-extrabold text-slate-100">
            Share Your Deduction
          </h2>
        </div>

        {/* Card Image Live Preview */}
        <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-2 sm:p-3 mb-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Generated 40Clues deduction result card"
              className="max-h-64 sm:max-h-72 w-auto object-contain rounded-lg shadow-md"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Generating result card...
            </div>
          )}
        </div>

        {/* Spoiler Toggle Option */}
        <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 px-3.5 py-2.5 rounded-xl mb-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            {includeSpoiler ? (
              <Eye className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
            <span>Show movie title on card</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle movie title spoiler on result card"
            aria-checked={includeSpoiler}
            onClick={() => setIncludeSpoiler(!includeSpoiler)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              includeSpoiler
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
            }`}
          >
            {includeSpoiler ? "Spoiler On" : "Spoiler-Free"}
          </button>
        </div>

        {/* Actions Button Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {canMobileShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Share Image Card</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadImage}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Image</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/90 text-slate-100 font-bold px-4 py-2.5 rounded-xl border border-slate-600/80 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {hasCopiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied Text!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" aria-hidden="true" />
                <span>Copy Emoji Text</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Helper Note */}
        <p className="text-[11px] text-slate-400 text-center mt-3">
          Share your score card directly to Instagram Stories, Twitter/X, Discord, or WhatsApp.
        </p>
      </div>
    </div>
  );
}
