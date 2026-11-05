import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Sign in required to access the TV puzzle archive.",
          isGuest: true,
          games: [],
        },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Fetch all daily TV games up to today, descending by date
    const { data: games, error } = await supabase
      .from("daily_games_tv")
      .select("id, game_date, year, seasons")
      .lte("game_date", today)
      .order("game_date", { ascending: false });

    if (error) {
      console.error("TV Archive games query error:", error.message);
      return NextResponse.json(
        { error: "Failed to retrieve archives" },
        { status: 500 }
      );
    }

    return NextResponse.json({ games: games || [] });
  } catch (err: unknown) {
    console.error("TV Archive games unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
