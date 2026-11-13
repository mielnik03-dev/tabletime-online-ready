import { GameModule, Player, shuffle } from "../types";

export const BUTTONS = [
  { id: "dam", label: "Бонжур, мадам!" },
  { id: "val", label: "Пардон, мсье!" },
  { id: "cor", label: "Салют!" },
  { id: "tuz", label: "Хлопок!" },
];

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  deck: number[];
  idx: number;
  turn: number;
  penalties: Record<string, number>;
  current: { r: number; s: number; special: string | null; btn: string } | null;
  deadline: number | null;
  presses: Record<string, { t: number; wrong: boolean }>;
  nextAt: number;
  over: boolean;
  botNext: Record<string, number>;
  log: string[];
};

function specialOf(r: number): { sp: string; btn: string } | null {
  if (r === 12) return { sp: "Q", btn: "dam" };
  if (r === 11) return { sp: "J", btn: "val" };
  if (r === 13) return { sp: "K", btn: "cor" };
  if (r === 1) return { sp: "A", btn: "tuz" };
  return null;
}

function endCard(gs: GS, now: number) {
  if (!gs.current) return;
  const wasSpecial = !!gs.current.special;
  if (!wasSpecial) {
    gs.current = null;
    gs.deadline = null;
    gs.presses = {};
    gs.nextAt = now + 700;
    return;
  }
  for (const p of gs.pids) {
    if (!gs.presses[p]) {
      gs.penalties[p]++;
      gs.log.push(`${gs.names[p]} не успел — штраф`);
    }
  }
  let last: string | null = null;
  let lastT = -1;
  for (const [pid, pr] of Object.entries(gs.presses)) {
    if (!pr.wrong && pr.t > lastT) { lastT = pr.t; last = pid; }
  }
  if (last) {
    gs.penalties[last]++;
    gs.log.push(`${gs.names[last]} нажал последним — штраф`);
  }
  gs.log = gs.log.slice(-5);
  gs.current = null;
  gs.deadline = null;
  gs.presses = {};
  gs.nextAt = now + 900;
}

const mod: GameModule = {
  id: "bonjour",
  title: "Бонжур, мадам!",
  tag: "Реакция",
  desc: "Специальная карта открыта — быстро нажми свою кнопку!",
  min: 2,
  max: 6,
  create(players: Player[]) {
    const deck: number[] = [];
    for (let r = 1; r <= 13; r++) for (let s = 0; s < 4; s++) deck.push(r * 4 + s);
    return {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      deck: shuffle(deck),
      idx: 0,
      turn: Math.floor(Math.random() * players.length),
      penalties: Object.fromEntries(players.map((p) => [p.id, 0])),
      current: null as any,
      deadline: null,
      presses: {} as GS["presses"],
      nextAt: Date.now() + 1500,
      over: false,
      botNext: {} as Record<string, number>,
      log: [] as string[],
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over || !gs.current || !gs.current.special || gs.presses[pid]) return;
    if (a.btn === gs.current.btn) {
      gs.presses[pid] = { t: Date.now(), wrong: false };
    } else {
      gs.penalties[pid]++;
      gs.presses[pid] = { t: Date.now(), wrong: true };
      gs.log.push(`${gs.names[pid]} нажал не то — штраф`);
    }
  },
  tick(gs: GS, now: number) {
    if (gs.over) return;
    if (!gs.current) {
      if (now < gs.nextAt) return;
      if (gs.idx >= gs.deck.length) { gs.over = true; return; }
      const c = gs.deck[gs.idx++];
      const r = Math.floor(c / 4) + 1;
      const s = c % 4;
      const sp = specialOf(r);
      gs.current = { r, s, special: sp?.sp ?? null, btn: sp?.btn ?? "" };
      if (sp) { gs.deadline = now + 8000; gs.presses = {}; }
      else gs.nextAt = now + 1500;
      gs.turn = (gs.turn + 1) % gs.pids.length;
    } else if (!gs.current.special) {
      if (now >= gs.nextAt) endCard(gs, now);
    } else {
      const all = gs.pids.every((p) => gs.presses[p]);
      if (all || now >= (gs.deadline as number)) endCard(gs, now);
    }
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over || !gs.current || !gs.current.special) return;
    for (const p of gs.pids) {
      if (!gs.bots[p] || gs.presses[p]) continue;
      if (!gs.botNext[p]) gs.botNext[p] = now + 400 + Math.random() * 2600;
      if (now < gs.botNext[p]) continue;
      const wrong = Math.random() < 0.1;
      const others = BUTTONS.filter((b) => b.id !== gs.current!.btn);
      const btn = wrong ? others[Math.floor(Math.random() * others.length)].id : (gs.current!.btn as string);
      if (btn === gs.current.btn) {
        gs.presses[p] = { t: now, wrong: false };
      } else {
        gs.penalties[p]++;
        gs.presses[p] = { t: now, wrong: true };
        gs.log.push(`${gs.names[p]} нажал не то — штраф`);
      }
    }
  },
  pub(gs: GS) {
    return {
      pids: gs.pids,
      deckLeft: gs.deck.length - gs.idx,
      current: gs.current ? { r: gs.current.r, s: gs.current.s, special: gs.current.special, btn: gs.current.btn } : null,
      deadline: gs.deadline,
      pressedCount: Object.keys(gs.presses).length,
      penalties: gs.penalties,
      over: gs.over,
      log: gs.log,
    };
  },
  priv(gs: GS, pid: string) {
    return {
      myPenalty: gs.penalties[pid] ?? 0,
      pressed: !!gs.presses[pid],
      wrong: gs.presses[pid]?.wrong ?? false,
      isBot: !!gs.bots[pid],
    };
  },
  rank(gs: GS) {
    return [...gs.pids].sort((a, b) => gs.penalties[a] - gs.penalties[b]);
  },
};

export default mod;
