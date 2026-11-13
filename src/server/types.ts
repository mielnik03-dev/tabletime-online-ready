export type Player = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  isBot: boolean;
  connected: boolean;
  joinedAt: number;
};

export type ChatMsg = {
  id: string;
  author: string; // playerId or 'system'
  text: string;
  ts: number;
  system?: boolean;
};

export type TournamentState = {
  active: boolean;
  done: boolean;
  round: number; // сколько игр сыграно (0..8)
  order: string[];
  standings: Record<string, number>;
  results: { id: string; title: string; points: Record<string, number>; winners: string[] }[];
};

export type RoomPhase = "lobby" | "playing" | "results" | "final";

export type Room = {
  code: string;
  v: number;
  hostId: string | null;
  players: Map<string, Player>;
  tokens: Map<string, string>; // token -> playerId
  chat: ChatMsg[];
  phase: RoomPhase;
  selectedGame: string | null;
  game: {
    id: string;
    state: any;
    finished: boolean;
    rank: string[] | null;
    points: Record<string, number> | null;
  } | null;
  tournament: TournamentState | null;
  clients: Map<string, { id: string; key: string; token: string; push: (s: string) => void }>;
  dirty: boolean;
  createdAt: number;
};

export type GameModule = {
  id: string;
  title: string;
  tag: string;
  desc: string;
  min: number;
  max: number;
  team?: boolean;
  create: (players: Player[]) => any;
  act: (gs: any, playerId: string, a: any) => void;
  tick?: (gs: any, now: number) => void;
  bots?: (gs: any, room: Room, now: number) => void;
  onChat?: (gs: any, playerId: string, text: string, say: (t: string) => void) => void;
  pub: (gs: any) => any;
  priv: (gs: any, playerId: string) => any;
  rank: (gs: any) => string[]; // от лучшего к худшему
  points?: (gs: any) => Record<string, number>; // точное начисление (командные)
};

export type RoomView = {
  code: string;
  v: number;
  phase: RoomPhase;
  hostId: string;
  players: Player[];
  chat: ChatMsg[];
  selectedGame: string | null;
  game: {
    id: string;
    title: string;
    gs: any;
    you: any;
    finished: boolean;
    rank: string[] | null;
    points: Record<string, number> | null;
  } | null;
  tournament: TournamentState | null;
};

export type FullView = {
  me: Player | null;
  gone?: boolean;
  room: RoomView | null;
};

export const TOURNAMENT_ORDER = [
  "bonjour",
  "shlyapa",
  "perudo",
  "loto",
  "parole",
  "veryu",
  "kubiki",
  "chapayev",
] as const;

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

export function roomCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "").trim();
}
