import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CRITICAL: cookies() must be awaited in Next.js 14+.
// Without the await, the cookie store is empty, getUser() always returns null,
// and every page redirect sends logged-in users back to /auth.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPA_URL, SUPA_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        toSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }>
      ) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only — safe to ignore.
        }
      },
    },
  });
}
