-- Signal Clash — realtime PvP schema.
-- Apply in the Supabase SQL editor for your project.
--
-- Model: one row per room; `data` holds the full Room JSON (the same shape the
-- game engine uses). The room creator is authoritative for round timing and
-- resolution; both players read the row over Realtime and write their own
-- predictions. (Hardening note for the security pass: replace the permissive
-- policies + last-write-wins JSON updates with per-prediction rows or RPCs and
-- wallet-signed auth before any non-devnet use.)

create table if not exists public.rooms (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

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
alter publication supabase_realtime add table public.rooms;

-- RLS. Devnet demo: anon can read/write all rooms. TIGHTEN before production.
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
