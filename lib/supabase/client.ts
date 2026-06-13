/**
 * Supabase client for the realtime PvP backend.
 *
 * Configured via public env vars (set these in `.env.local` / Vercel):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * When the env is absent the app falls back to the in-memory mock adapter, so
 * local dev and builds work without a backend. Online human-vs-human play needs
 * these set and the schema in `supabase/schema.sql` applied.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseEnabled(): boolean {
  return Boolean(URL && ANON);
}

let client: SupabaseClient | null = null;

/** Shared Supabase client, or null when env is not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled()) return null;
  if (!client) {
    client = createClient(URL as string, ANON as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
