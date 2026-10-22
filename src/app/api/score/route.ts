import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gameDate, cluesUsed, score } = await request.json();

    // 1. Inserare în tabela daily_scores
    const { error: scoreError } = await supabase.from("daily_scores").upsert(
      {
        user_id: user.id,
        game_date: gameDate,
        clues_used: cluesUsed,
        score: score,
      },
      { onConflict: "user_id,game_date" }
    );

    if (scoreError) {
      return NextResponse.json({ error: scoreError.message }, { status: 400 });
    }

    // 2. Recalculare profil utilizator (puncte totale și meciuri jucate)
    const { data: allScores } = await supabase
      .from("daily_scores")
      .select("score")
      .eq("user_id", user.id);

    const totalScore = (allScores || []).reduce((acc, curr) => acc + (curr.score || 0), 0);
    const gamesPlayed = (allScores || []).length;

    await supabase
      .from("profiles")
      .update({
        total_score: totalScore,
        games_played: gamesPlayed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true, totalScore, gamesPlayed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}