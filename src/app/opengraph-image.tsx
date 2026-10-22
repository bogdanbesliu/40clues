import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "40Clues - Daily Movie Trivia Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
          backgroundImage: "radial-gradient(circle at 50% 30%, #1e293b 0%, #020617 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "50px",
            padding: "8px 24px",
            fontSize: 20,
            color: "#f59e0b",
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          🎬 CINEMA EDITION
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: "-2px",
            background: "linear-gradient(to right, #f59e0b, #f97316, #ef4444)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 10,
          }}
        >
          40Clues
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#94a3b8",
            fontWeight: 500,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          40 clues. One movie. Can you deduce today's secret film?
        </div>

        {/* Score preview mockup */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: 40,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "16px 32px",
              fontSize: 22,
              color: "#38bdf8",
              fontWeight: 700,
            }}
          >
            💡 40 Shuffled Clues
          </div>
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "16px 32px",
              fontSize: 22,
              color: "#fbbf24",
              fontWeight: 700,
            }}
          >
            🏆 1000 Max Score
          </div>
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "16px",
              padding: "16px 32px",
              fontSize: 22,
              color: "#fb7185",
              fontWeight: 700,
            }}
          >
            🔥 Daily Streaks
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}