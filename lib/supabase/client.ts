import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses only the public URL and anon key — safe to ship to the
 * client. Auth and RLS do the real access-control work; this client has no elevated privileges.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
