import { NextResponse } from "next/server";
import { runDailyGenerator } from "@/../scripts/generate-daily";

// Allow function to run up to 60 seconds on Vercel without 504 Timeout
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const secretQuery = searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (
      expectedSecret &&
      authHeader !== `Bearer ${expectedSecret}` &&
      secretQuery !== expectedSecret
    ) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const result = await runDailyGenerator();

    return NextResponse.json({
      success: true,
      message: "Daily movie generated via script",
      result,
    });
  } catch (err: any) {
    console.error("Cron failed:", err);
    return NextResponse.json(
      { error: "Generation failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}