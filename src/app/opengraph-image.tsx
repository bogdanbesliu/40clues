import { ImageResponse } from "next/og";

export const alt = "40clues.com - Guess the movie in 40 clues!";
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
            backgroundColor: "#1e293b",
            borderRadius: "50px",
            padding: "8px 24px",
            fontSize: 22,
            color: "#f59e0b",
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          🎬 CINEMA EDITION
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 90,
            fontWeight: 900,
            color: "#f59e0b",
            marginBottom: 12,
            letterSpacing: "-2px",
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

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: 48,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              borderRadius: "16px",
              padding: "16px 28px",
              fontSize: 20,
              color: "#38bdf8",
              fontWeight: 700,
            }}
          >
            💡 40 Shuffled Clues
          </div>
          <div
            style={{
              backgroundColor: "#0f172a",
              borderRadius: "16px",
              padding: "16px 28px",
              fontSize: 20,
              color: "#fbbf24",
              fontWeight: 700,
            }}
          >
            🏆 1000 Max Score
          </div>
          <div
            style={{
              backgroundColor: "#0f172a",
              borderRadius: "16px",
              padding: "16px 28px",
              fontSize: 20,
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