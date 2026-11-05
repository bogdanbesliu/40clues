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

interface SeriesShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  clueNumber: number;
  totalClues: number;
  streak: number;
  rankBadge: string;
  seriesTitle: string;
  seriesYear: number | string;
  hasWon: boolean;
  hasGivenUp?: boolean;
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

export default function SeriesShareModal({
  isOpen,
  onClose,
  score,
  clueNumber,
  totalClues,
  streak,
  rankBadge,
  seriesTitle,
  seriesYear,
  hasWon,
  hasGivenUp = false,
  gameDate,
}: SeriesShareModalProps) {
  const [includeSpoiler, setIncludeSpoiler] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const [hasCopiedImage, setHasCopiedImage] = useState(false);
  const [canMobileShare, setCanMobileShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

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

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, "#080c18");
    bgGrad.addColorStop(0.5, "#020617");
    bgGrad.addColorStop(1, "#0d1527");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Ambient glow
    const glow = ctx.createRadialGradient(540, 150, 20, 540, 150, 480);
    glow.addColorStop(0, "rgba(59, 130, 246, 0.16)");
    glow.addColorStop(0.5, "rgba(245, 158, 11, 0.12)");
    glow.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 700);

    // Card border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 980, 980);

    // Header title: "40Clues"
    ctx.textAlign = "center";
    ctx.font = "900 78px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const titleGrad = ctx.createLinearGradient(350, 0, 730, 0);
    titleGrad.addColorStop(0, "#FBBF24");
    titleGrad.addColorStop(0.5, "#F59E0B");
    titleGrad.addColorStop(1, "#38BDF8");
    ctx.fillStyle = titleGrad;
    ctx.fillText("40Clues", 540, 160);

    // Subtitle & Date
    ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#94A3B8";
    const dateLabel = gameDate ? `TV SERIES EDITION • ${gameDate.toUpperCase()}` : "TV SERIES EDITION";
    ctx.fillText(dateLabel, 540, 205);

    // Rank Badge Pill
    const badgeText = hasWon
      ? rankBadge
      : hasGivenUp
        ? "🏳️ Surrendered"
        : "📺 TV Enthusiast";
    ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 60;
    const badgeX = 540 - badgeWidth / 2;

    ctx.fillStyle = hasGivenUp
      ? "rgba(244, 63, 94, 0.15)"
      : "rgba(245, 158, 11, 0.15)";
    ctx.strokeStyle = hasGivenUp
      ? "rgba(244, 63, 94, 0.5)"
      : "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, 245, badgeWidth, 54, 27);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hasGivenUp ? "#FECDD3" : "#FDE68A";
    ctx.fillText(badgeText, 540, 282);

    // Stats Grid
    const statBoxes = [
      {
        label: hasGivenUp ? "SCORE AT SURRENDER" : "FINAL SCORE",
        value: hasWon || hasGivenUp ? `${score} pts` : "0 pts",
        color: "#FBBF24",
      },
      {
        label: hasGivenUp ? "CLUES SEEN" : "CLUES USED",
        value: `${clueNumber} / ${totalClues}`,
        color: "#F1F5F9",
      },
      {
        label: "TV STREAK",
        value: `${streak} DAYS 🔥`,
        color: "#FB923C",
      },
    ];

    const boxWidth = 280;
    const boxHeight = 160;
    const gap = 40;
    const startX = 540 - (boxWidth * 3 + gap * 2) / 2;
    const boxY = 340;

    statBoxes.forEach((stat, i) => {
      const x = startX + i * (boxWidth + gap);
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawRoundedRect(ctx, x, boxY, boxWidth, boxHeight, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(stat.label, x + boxWidth / 2, boxY + 45);

      ctx.fillStyle = stat.color;
      ctx.font = "900 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(stat.value, x + boxWidth / 2, boxY + 110);
    });

    // Target TV Series Section
    const showBoxY = 540;
    const showBoxH = 260;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRect(ctx, 100, showBoxY, 880, showBoxH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("TODAY'S TARGET TV SERIES", 540, showBoxY + 50);

    if (includeSpoiler) {
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "900 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const displayTitle = seriesTitle || "Mystery Series";
      ctx.fillText(displayTitle, 540, showBoxY + 130);

      ctx.fillStyle = "#CBD5E1";
      ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`Premiered in ${seriesYear}`, 540, showBoxY + 180);
    } else {
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.beginPath();
      drawRoundedRect(ctx, 240, showBoxY + 80, 600, 110, 16);
      ctx.fill();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("🔒 SPOILER HIDDEN", 540, showBoxY + 135);

      ctx.fillStyle = "#64748B";
      ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Keep the mystery alive for friends", 540, showBoxY + 165);
    }

    // Clue Progress Visualizer
    const barY = 840;
    const barW = 880;
    const barH = 16;
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    drawRoundedRect(ctx, 100, barY, barW, barH, 8);
    ctx.fill();

    const progressRatio = Math.min(1, clueNumber / totalClues);
    const fillW = Math.max(16, barW * progressRatio);
    const barGrad = ctx.createLinearGradient(100, 0, 980, 0);
    barGrad.addColorStop(0, "#10B981");
    barGrad.addColorStop(0.5, "#F59E0B");
    barGrad.addColorStop(1, "#EF4444");
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    drawRoundedRect(ctx, 100, barY, fillW, barH, 8);
    ctx.fill();

    // Footer
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("CAN YOU GUESS TODAY'S SECRET TV SHOW IN 40 CLUES?", 540, 930);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "800 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("40CLUES.COM/SERIES", 540, 975);

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
    seriesTitle,
    seriesYear,
    hasWon,
    hasGivenUp,
    gameDate,
  ]);

  if (!isOpen) return null;

  const generateShareText = () => {
    if (hasGivenUp) {
      const emojiGrid = "⬛".repeat(5);
      const spoilerPart = includeSpoiler ? `\n📺 TV Show: ${seriesTitle} (${seriesYear})` : "";
      return `40Clues #Series 📺\n🏳️ I gave up after ${clueNumber} clues\n💡 Clues seen: ${clueNumber}/${totalClues}\n🎯 Score: ${score} pts\n🔥 ${streak}-day streak\n${emojiGrid}${spoilerPart}\n\nhttps://40clues.com/series`;
    }
    const blocksCount = Math.min(5, Math.ceil(clueNumber / 8));
    const greenBlock = "🟩";
    const blackBlock = "⬛";
    const emojiGrid =
      greenBlock.repeat(Math.max(1, 6 - blocksCount)) +
      blackBlock.repeat(blocksCount - 1);
    const spoilerPart = includeSpoiler ? `\n📺 TV Show: ${seriesTitle} (${seriesYear})` : "";
    return `40Clues #Series 📺\n💡 ${clueNumber}/${totalClues} clues\n🏆 ${score} pts\n🔥 ${streak}-day streak\n${emojiGrid}${spoilerPart}\n\nhttps://40clues.com/series`;
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
    a.download = `40clues-series-${gameDate || "today"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], `40clues-series-${gameDate || "today"}.png`, {
      type: "image/png",
    });

    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;

    try {
      if (nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "40Clues TV Series Result",
          text: generateShareText(),
        });
      } else if (nav && typeof nav.share === "function") {
        await nav.share({
          title: "40Clues TV Series Result",
          text: generateShareText(),
        });
      }
    } catch {
      handleCopyText();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Share2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="series-share-modal-title" className="text-lg font-black text-slate-100">
              Share Your TV Result
            </h2>
            <p className="text-xs text-slate-400">Challenge your friends to beat your deductions</p>
          </div>
        </div>

        {/* Image Preview */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="40Clues TV series scorecard"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" aria-hidden="true" />
              <span>Rendering scorecard...</span>
            </div>
          )}
        </div>

        {/* Spoiler Toggle */}
        <button
          onClick={() => setIncludeSpoiler(!includeSpoiler)}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            includeSpoiler
              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
              : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {includeSpoiler ? (
              <Eye className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
            <span>Reveal TV show title in shared card</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {includeSpoiler ? "Spoiler ON" : "Hidden"}
          </span>
        </button>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {canMobileShare && (
            <button
              onClick={handleNativeShare}
              className="col-span-2 min-h-[48px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Share Card (Instagram / WhatsApp)</span>
            </button>
          )}

          <button
            onClick={handleDownloadImage}
            className="min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Download className="w-4 h-4 text-slate-300" aria-hidden="true" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopyText}
            className="min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {hasCopiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" aria-hidden="true" />
                <span>Copy Text Grid</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
