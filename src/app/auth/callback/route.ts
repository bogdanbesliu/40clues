import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/";

  // Ensure production redirects always return to canonical https://40clues.com
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const targetOrigin = isLocal ? origin : "https://40clues.com";

  // Mitigate Open Redirect: Validate that 'next' starts with a single '/' and not '//' or protocol
  let safeNext = "/";
  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")) {
    safeNext = rawNext;
  }

  if (code) {
    const cookieStore = await cookies();

    // Create redirect response upfront targeting the canonical domain
    const response = NextResponse.redirect(`${targetOrigin}${safeNext}`);

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
                response.cookies.set(name, value, options);
              });
            } catch (err) {
              console.error("Auth callback cookie set error:", err);
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    } else {
      console.error("Auth exchangeCodeForSession error:", error);
    }
  }

  return NextResponse.redirect(`${targetOrigin}/?auth_error=true`);
}
