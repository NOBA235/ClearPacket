import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server Actions. Reads
 * the user's session from cookies so RLS policies apply as that user — never the service role.
 * For trusted server-only operations (e.g. writing benchmark_runs from the eval CLI) use a
 * separate client constructed directly with SUPABASE_SERVICE_ROLE_KEY, and never import that
 * one into anything reachable from a request handler that takes user input.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component render — middleware refreshes the session instead.
        }
      },
    },
  });
}
