-- Signal Clash — realtime PvP schema. Apply in the Supabase SQL editor.
-- Idempotent: safe to re-run after hardening changes.
--
-- Model: one row per room; `data` jsonb = full Room JSON (the game engine's
-- shape). The room creator (host) is authoritative for round timing/resolution;
-- both players read the row over Realtime and write their own predictions.
--
-- SECURITY POSTURE (read before any non-devnet use):
--   * Writes use the PUBLIC anon key, so any client can insert/update any room
--     row. This is acceptable ONLY for a devnet demo. The integrity constraints
--     below stop the cheap griefing (id desync, oversized blobs, deletes), but
--     they do NOT prove the writer owns the wallet or that a score is legitimate.
--   * The real fix (next phase): replace direct table writes with Postgres RPCs
--     (SECURITY DEFINER) that validate each state transition, and gate mutations
--     behind a wallet signature verified by a Supabase Edge Function (or move to
--     per-prediction rows so players can only write their own row). Until then,
--     treat all room state as untrusted client input — never settle real funds
--     on it (devnet only).

create table if not exists public.rooms (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

-- Integrity guards: data must be a JSON object whose id matches the pk, and the
-- blob is size-capped to prevent storage abuse. (Drop+add for idempotency.)
alter table public.rooms drop constraint if exists rooms_data_object;
alter table public.rooms
  add constraint rooms_data_object
  check (jsonb_typeof(data) = 'object' and data->>'id' = id);

alter table public.rooms drop constraint if exists rooms_data_size;
alter table public.rooms
  add constraint rooms_data_size
  check (octet_length(data::text) < 200000);

-- Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
  before update on public.rooms
  for each row execute function public.touch_updated_at();

-- Realtime: broadcast row changes to subscribed clients.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- RLS. Devnet demo: anon may read/insert/update rooms; DELETE is denied (no
-- policy = default deny). TIGHTEN (signed writes / RPCs) before production.
alter table public.rooms enable row level security;

drop policy if exists rooms_anon_select on public.rooms;
create policy rooms_anon_select on public.rooms
  for select using (true);

drop policy if exists rooms_anon_insert on public.rooms;
create policy rooms_anon_insert on public.rooms
  for insert with check (true);

drop policy if exists rooms_anon_update on public.rooms;
create policy rooms_anon_update on public.rooms
  for update using (true) with check (true);
