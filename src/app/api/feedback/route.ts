import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export async function POST(request: Request) {
    try {
        // Extract the visitor's IP address (Vercel populates this header automatically)
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip";

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY in feedback route");
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        // Use the Service Role Key for full admin privileges on the server, bypassing RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. ANTI-SPAM SYSTEM (Rate Limiting)
        // Check how many messages this IP has sent within the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: countError } = await supabaseAdmin
            .from("feedback")
            .select("*", { count: "exact", head: true })
            .eq("ip_address", ip)
            .gte("created_at", oneHourAgo);

        if (countError) throw countError;

        // Rate limit: maximum 3 messages per hour per IP address
        if (count !== null && count >= 3) {
            return NextResponse.json(
                { error: "You have sent too many messages. Please try again later." },
                { status: 429 }
            );
        }

        // 2. MESSAGE PROCESSING
        const { message } = await request.json();

        if (!message || message.trim().length < 5) {
            return NextResponse.json(
                { error: "The message is too short. Please provide more details." },
                { status: 400 }
            );
        }

        if (message.length > 1000) {
            return NextResponse.json(
                { error: "The message exceeds the 1000 characters limit." },
                { status: 400 }
            );
        }

        // 3. AUTHENTICATION VERIFICATION
        // Do not trust client-supplied userId from body. Verify against actual session:
        const user = await getAuthenticatedUser(request);
        const verifiedUserId = user?.id || null;

        // 4. DATABASE INSERTION
        const { error: insertError } = await supabaseAdmin.from("feedback").insert({
            user_id: verifiedUserId,
            message: message.trim(),
            ip_address: ip,
        });

        if (insertError) throw insertError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Feedback API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
