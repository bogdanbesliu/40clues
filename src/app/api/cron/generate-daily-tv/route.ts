import { NextResponse } from "next/server";
import { runDailyTvGenerator } from "@/../scripts/generate-daily-tv";
import crypto from "crypto";

// Allow function to run up to 60 seconds on Vercel without 504 Timeout
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("Cron failed: CRON_SECRET environment variable is not configured.");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const providedSecret = authHeader.slice(7);

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSecret);
    const providedBuffer = Buffer.from(providedSecret);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const result = await runDailyTvGenerator();

    return NextResponse.json({
      success: true,
      message: "Daily TV series generated via script",
      result,
    });
  } catch (err: unknown) {
    console.error("TV Cron failed:", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
