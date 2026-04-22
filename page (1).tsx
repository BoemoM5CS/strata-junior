import { createBrowserClient } from "@supabase/ssr";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton — same client instance is reused across the app.
// Prevents duplicate realtime subscriptions on re-renders.
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(SUPA_URL, SUPA_KEY);
  }
  return client;
}
