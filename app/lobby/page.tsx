"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Activity,
  BadgeDollarSign,
  Plus,
  Radio,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import RoomCard from "@/components/RoomCard";
import TournamentCard from "@/components/TournamentCard";
import CreateRoomForm from "@/components/CreateRoomForm";
import CreateTournamentForm from "@/components/CreateTournamentForm";
import { useLobbyStore } from "@/lib/state/lobbyStore";
import { isAdminWallet, solFromLamports } from "@/lib/config";
import type { Market, Room } from "@/lib/game/types";

type CreateMode = "room" | "tournament";

export default function LobbyPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const { rooms, ensureSeeded, createRoom, createTournament, joinRoom } =
    useLobbyStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>("room");
  const isAdmin = isAdminWallet(wallet);

  useEffect(() => {
    void ensureSeeded();
  }, [ensureSeeded]);

  const onCreateRoom = async (
    market: Market,
    entryFeeSol: number,
    maxPlayers: number,
    roundSeconds: number,
  ) => {
    if (!wallet) return;
    const id = await createRoom(
      wallet,
      market,
      entryFeeSol,
      maxPlayers,
      roundSeconds,
    );
    router.push(`/room/${id}`);
  };

  const onCreateTournament = async (
    market: Market,
    entryFeeSol: number,
    field: number,
    rounds: number,
    startsAtMs: number,
    roundSeconds: number,
  ) => {
    if (!wallet || !isAdmin) return;
    const id = await createTournament(
      wallet,
      market,
      entryFeeSol,
      field,
      rounds,
      startsAtMs,
      roundSeconds,
    );
    router.push(`/tournament/${id}`);
  };

  const onPlayRoom = async (room: Room) => {
    if (!wallet) return;
    setBusyId(room.id);
    try {
      const amParticipant = room.players[wallet] !== undefined;
      const hasRoom = Object.keys(room.players).length < room.maxPlayers;
      if (!amParticipant && hasRoom) {
        await joinRoom(room.id, wallet);
      }
      router.push(`/room/${room.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const onEnterTournament = (room: Room) => {
    if (!wallet) return;
    setBusyId(room.id);
    router.push(`/tournament/${room.id}`);
  };

  const tournaments = rooms
    .filter((r) => r.kind === "tournament" && r.status !== "finished")
    .sort((a, b) => (a.startsAt ?? 0) - (b.startsAt ?? 0));
  const openRooms = rooms.filter(
    (r) => r.kind !== "tournament" && r.status !== "finished",
  );
  const liveCount = rooms.filter((r) => r.status === "active").length;
  const prizePoolSol = useMemo(() => {
    const tourPool = tournaments.reduce(
      (sum, t) => sum + solFromLamports(t.entryFeeLamports * t.maxPlayers),
      0,
    );
    const roomPool = openRooms.reduce(
      (sum, room) => sum + solFromLamports(room.prizePoolLamports),
      0,
    );
    return tourPool + roomPool;
  }, [tournaments, openRooms]);

  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--ink)]">
      <Header />
      <main className="app-main">
        <section className="app-hero p-5 md:p-8">
          <div className="signal-scan" />
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <div>
              <div className="app-kicker">
                <Radio size={15} aria-hidden />
                Enter the arena lobby
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-none md:text-7xl">
                Join a tournament or jump into a quick match.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--ink-muted)] md:text-lg">
                Scheduled tournaments pit a full field against the same market —
                top 3 split the pool. Or spin up a fast 2-6 player room.
              </p>
              {!wallet && (
                <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(245,165,36,0.32)] bg-[rgba(245,165,36,0.08)] px-4 py-3 text-sm font-semibold text-[var(--flat)]">
                  <ShieldCheck size={16} aria-hidden />
                  Connect wallet to register or create.
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <LobbyMetric icon={Trophy} label="Tournaments" value={tournaments.length} />
              <LobbyMetric icon={Activity} label="Live now" value={liveCount} />
              <LobbyMetric
                icon={BadgeDollarSign}
                label="Devnet pool"
                value={`${prizePoolSol.toFixed(2)} SOL`}
              />
            </div>
          </div>
        </section>

        {/* Tournaments */}
        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="app-eyebrow">
                <Trophy size={15} className="text-[var(--purple)]" aria-hidden />
                Scheduled tournaments
              </div>
              <h2 className="mt-2 font-display text-3xl font-bold">
                Big-field clashes
              </h2>
            </div>
            <span className="chip text-[var(--ink-muted)]">
              <Users size={13} aria-hidden />
              Top 3 split 50 / 30 / 20
            </span>
          </div>

          {tournaments.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Tournaments coming soon"
              body={
                isAdmin
                  ? "No tournaments scheduled yet. Use the organizer panel to create one with a start timer."
                  : "Big-field tournaments with shared prize pools are on the way. Check back soon — or jump into a quick match below."
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  room={t}
                  busy={busyId === t.id}
                  onEnter={onEnterTournament}
                />
              ))}
            </div>
          )}
        </section>

        {/* Rooms + create */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="app-panel p-4 md:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="app-eyebrow">
                  <span className="status-dot" />
                  Quick-match rooms
                </div>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  2-6 player arenas
                </h2>
              </div>
              <span className="chip text-[var(--ink-muted)]">
                <Users size={13} aria-hidden />
                Bot fills empty seats in demo
              </span>
            </div>

            {openRooms.length === 0 ? (
              <EmptyState
                icon={Swords}
                title="No open arenas yet"
                body={
                  wallet
                    ? "Create the first room and the demo bot will be ready to clash."
                    : "Connect wallet, then create the first room or join one when it appears."
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {openRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    busy={busyId === room.id}
                    onPlay={onPlayRoom}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-28 lg:h-fit">
            {isAdmin ? (
              <>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[rgba(220,31,255,0.32)] bg-[rgba(220,31,255,0.07)] px-3 py-1.5 text-xs font-bold text-[var(--purple)]">
                  <Trophy size={13} aria-hidden />
                  Organizer panel
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCreateMode("room")}
                    className={`btn min-h-11 ${createMode === "room" ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Plus size={15} aria-hidden />
                    Room
                  </button>
                  <button
                    onClick={() => setCreateMode("tournament")}
                    className={`btn min-h-11 ${createMode === "tournament" ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Trophy size={15} aria-hidden />
                    Tournament
                  </button>
                </div>
                {createMode === "room" ? (
                  <CreateRoomForm disabled={!wallet} onCreate={onCreateRoom} />
                ) : (
                  <CreateTournamentForm
                    disabled={!wallet}
                    onCreate={onCreateTournament}
                  />
                )}
              </>
            ) : (
              <CreateRoomForm disabled={!wallet} onCreate={onCreateRoom} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function LobbyMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="metric-tile clip-corner">
      <div className="flex items-center gap-2 text-[var(--ocean)]">
        <Icon size={16} aria-hidden />
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value text-2xl">{value}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-[rgba(3,225,255,0.24)] bg-[rgba(3,225,255,0.04)] p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[rgba(0,255,163,0.3)] bg-[rgba(0,255,163,0.08)] text-[var(--surge)]">
          <Icon size={22} aria-hidden />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
          {body}
        </p>
      </div>
    </div>
  );
}
