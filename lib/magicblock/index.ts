/**
 * Adapter selection: use the Supabase realtime backend when configured,
 * otherwise fall back to the in-memory mock (local dev / builds without creds).
 */

import type { MagicBlockAdapter } from "./types";
import { LocalMagicBlockAdapter } from "./mockAdapter";
import { SupabaseAdapter } from "./supabaseAdapter";
import { isSupabaseEnabled } from "@/lib/supabase/client";

export const magicBlock: MagicBlockAdapter = isSupabaseEnabled()
  ? new SupabaseAdapter()
  : new LocalMagicBlockAdapter();
