import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        experimental: {
          passkey: true,
        },
      },
    }
  );
}

export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
}
