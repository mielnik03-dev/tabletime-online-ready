import { GameModule, Player } from "../types";

export const BOARD = 8;
const R = 0.42;
const FRICTION = 0.97;
const STOP = 0.02;
const OUT_V = 0.24;

type Chip = { id: number; pid: string; x: number; y: number; vx: number; vy: number; out: boolean };
type Match = { a: string; b: string | null };

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  bracket: Match[][];
  roundIdx: number;
  matchIdx: number;
  match: { a: string; b: string } | null;
  matchWins: Record<string, number>;
  chips: Chip[];
  turn: string | null;
  phase: "aim" | "sim" | "gap" | "over";
  simUntil: number;
  firstMover: string | null;
  gapUntil: number;
  over: boolean;
  champion: string | null;
  log: string[];
  botNext: Record<string, number>;
};

function buildBracket(pids: string[]): Match[][] {
  let round: Match[] = [];
  for (let i = 0; i < pids.length; i += 2) {
    round.push({ a: pids[i], b: i + 1 < pids.length ? pids[i + 1] : null });
  }
  const out: Match[][] = [round];
  let size = Math.ceil(pids.length / 2);
  while (size > 1) {
    const next: Match[] = [];
    for (let i = 0; i < size; i += 2) {
      next.push({ a: "", b: i + 1 < size ? "" : null });
    }
    out.push(next);
    size = Math.ceil(size / 2);
  }
  return out;
}

function resetChips(gs: GS) {
  if (!gs.match) return;
  const chips: Chip[] = [];
  let id = 0;
  const ys = [1.5, 3.0, 4.5, 6.0];
  for (const [side, xs] of [[0, [1.3, 2.7]], [1, [5.3, 6.7]]] as [number, number[]][]) {
    const pid = side === 0 ? gs.match.a : gs.match.b;
    for (const x of xs) for (const y of ys) chips.push({ id: id++, pid, x, y, vx: 0, vy: 0, out: false });
  }
  gs.chips = chips;
}

function matchWinner(gs: GS): string {
  const m = gs.match!;
  return (gs.matchWins[m.a] ?? 0) >= 3 ? m.a : m.b;
}

function advanceBracket(gs: GS, now: number) {
  // выигравший матч идёт дальше по сетке
  const m = gs.match!;
  const winner = matchWinner(gs);
  const r = gs.bracket[gs.roundIdx][gs.matchIdx];
  void r;
  if (gs.roundIdx + 1 >= gs.bracket.length) {
    gs.over = true;
    gs.champion = winner;
    gs.phase = "over";
    gs.log = [`${gs.names[winner]} — чемпион Чапаева!`, ...gs.log].slice(0, 5);
    return;
  }
  // ищем место следующего раунда
  const pairsSoFar = gs.matchIdx % 2;
  const next = gs.bracket[gs.roundIdx + 1];
  const slot = Math.floor(gs.matchIdx / 2);
  if (pairsSoFar === 0) next[slot].a = winner;
  else next[slot].b = winner;
  gs.roundIdx++;
  gs.matchIdx = 0;
  startMatch(gs, now);
}

function startMatch(gs: GS, now: number) {
  const m = gs.bracket[gs.roundIdx][gs.matchIdx];
  if (!m.b) {
    // bye
    advanceBracket(gs, now);
    return;
  }
  gs.match = { a: m.a, b: m.b };
  gs.matchWins[m.a] = 0;
  gs.matchWins[m.b] = 0;
  gs.firstMover = m.a;
  gs.turn = m.a;
  gs.phase = "aim";
  resetChips(gs);
  gs.log = [`Матч: ${gs.names[m.a]} против ${gs.names[m.b]}`, ...gs.log].slice(0, 5);
}

function finishRound(gs: GS, now: number) {
  if (!gs.match) return;
  const left = (pid: string) => gs.chips.filter((c) => c.pid === pid && !c.out).length;
  const la = left(gs.match.a), lb = left(gs.match.b);
  if (la > 0 && lb > 0) return; // не закончился
  if (la === 0 && lb === 0) {
    gs.log = ["Ничья в раунде — играем ещё", ...gs.log].slice(0, 5);
  } else {
    const w = la > 0 ? gs.match.a : gs.match.b;
    gs.matchWins[w]++;
    gs.log = [`${gs.names[w]} выиграл раунд (${gs.matchWins[w]})`, ...gs.log].slice(0, 5);
    if (gs.matchWins[w] >= 3) { advanceBracket(gs, now); return; }
  }
  gs.firstMover = gs.turn === gs.match.a ? gs.match.b : gs.match.a;
  gs.turn = gs.firstMover;
  gs.phase = "aim";
  resetChips(gs);
}

function stepPhysics(gs: GS) {
  for (const c of gs.chips) {
    if (c.out) continue;
    c.x += c.vx;
    c.y += c.vy;
    c.vx *= FRICTION;
    c.vy *= FRICTION;
    if (Math.abs(c.vx) < STOP) c.vx = 0;
    if (Math.abs(c.vy) < STOP) c.vy = 0;
  }
  // столкновения
  for (let i = 0; i < gs.chips.length; i++) {
    const a = gs.chips[i];
    if (a.out) continue;
    for (let j = i + 1; j < gs.chips.length; j++) {
      const b = gs.chips[j];
      if (b.out) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d >= 2 * R) continue;
      const nx = dx / d, ny = dy / d;
      const overlap = (2 * R - d) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap;
      b.x += nx * overlap; b.y += ny * overlap;
      const van = a.vx * nx + a.vy * ny;
      const vbn = b.vx * nx + b.vy * ny;
      if (van - vbn <= 0) continue;
      a.vx += (vbn - van) * nx; a.vy += (vbn - van) * ny;
      b.vx += (van - vbn) * nx; b.vy += (van - vbn) * ny;
    }
  }
  // края
  for (const c of gs.chips) {
    if (c.out) continue;
    for (const [axis, dir] of [["x", -1], ["x", 1], ["y", -1], ["y", 1]] as [keyof Pick<Chip, "x" | "y">, number][]) {
      const v = axis === "x" ? c.vx : c.vy;
      const atEdge = dir === -1 ? c[axis] - R < 0 : c[axis] + R > BOARD;
      if (!atEdge) continue;
      if (Math.abs(v) > OUT_V) {
        c.out = true;
        c.vx = 0; c.vy = 0;
        gs.log = [`${gs.names[c.pid]} выбил шашку!`, ...gs.log].slice(0, 5);
      } else {
        c[axis] = dir === -1 ? R : BOARD - R;
        if (axis === "x") c.vx = -c.vx * 0.5; else c.vy = -c.vy * 0.5;
      }
    }
  }
  return gs.chips.every((c) => c.out || (c.vx === 0 && c.vy === 0));
}

const mod: GameModule = {
  id: "chapayev",
  title: "Чапаев",
  tag: "Физика 8×8",
  desc: "Выбей все 8 шашек соперника. Матч до 3 побед в раундах.",
  min: 2,
  max: 8,
  create(players: Player[]) {
    const bracket = buildBracket(players.map((p) => p.id));
    const gs: GS = {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      bracket,
      roundIdx: 0,
      matchIdx: 0,
      match: null,
      matchWins: {},
      chips: [],
      turn: null,
      phase: "gap",
      simUntil: 0,
      firstMover: null,
      gapUntil: Date.now() + 1500,
      over: false,
      champion: null,
      log: ["Собираемся у стола…"],
      botNext: {},
    };
    startMatch(gs, Date.now());
    return gs;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over || gs.phase !== "aim" || !gs.match) throw new Error("Сейчас нельзя ходить");
    if (gs.turn !== pid) throw new Error("Ходит другой игрок");
    const chip = gs.chips.find((c) => c.id === Number(a.chip));
    if (!chip || chip.out || chip.pid !== pid) throw new Error("Выбери свою шашку");
    const tx = Number(a.tx), ty = Number(a.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || tx < 0.3 || tx > BOARD - 0.3 || ty < 0.3 || ty > BOARD - 0.3)
      throw new Error("Цель вне доски");
    const dx = tx - chip.x, dy = ty - chip.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.3) throw new Error("Слишком близко");
    const power = Math.min(0.6, Math.max(0.12, len * 0.18));
    chip.vx = (dx / len) * power;
    chip.vy = (dy / len) * power;
    gs.phase = "sim";
    gs.simUntil = Date.now() + 9000;
  },
  tick(gs: GS, now: number) {
    if (gs.over) return;
    if (gs.phase === "gap") {
      if (now >= gs.gapUntil && gs.match) { gs.phase = "aim"; }
      return;
    }
    if (gs.phase === "aim") return;
    if (gs.phase === "sim") {
      let settled = false;
      for (let i = 0; i < 4; i++) { if (stepPhysics(gs)) { settled = true; } }
      if (settled || now >= gs.simUntil) {
        for (const c of gs.chips) { c.vx = 0; c.vy = 0; }
        finishRound(gs, now);
      }
    }
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over || gs.phase !== "aim" || !gs.turn || !gs.bots[gs.turn]) return;
    if (!gs.botNext[gs.turn]) gs.botNext[gs.turn] = now + 1500 + Math.random() * 2000;
    if (now < gs.botNext[gs.turn]) return;
    try {
      const mine = gs.chips.filter((c) => c.pid === gs.turn && !c.out);
      const foe = gs.match!;
      const foePid = gs.turn === foe.a ? foe.b : foe.a;
      const theirs = gs.chips.filter((c) => c.pid === foePid && !c.out);
      if (!mine.length || !theirs.length) return;
      const chip = mine[Math.floor(Math.random() * mine.length)];
      const target = theirs[Math.floor(Math.random() * theirs.length)];
      const dx = target.x - chip.x, dy = target.y - chip.y;
      const len = Math.hypot(dx, dy) || 1;
      const jitter = (Math.random() - 0.5) * 0.5;
      const tx = Math.min(BOARD - 0.4, Math.max(0.4, target.x + (dx / len) * 1.2 + jitter));
      const ty = Math.min(BOARD - 0.4, Math.max(0.4, target.y + (dy / len) * 1.2 + jitter));
      mod.act(gs, gs.turn, { chip: chip.id, tx, ty });
      gs.botNext[gs.turn] = 0;
    } catch {
      gs.botNext[gs.turn] = now + 1000;
    }
  },
  pub(gs: GS) {
    return {
      chips: gs.chips.map((c) => ({ id: c.id, pid: c.pid, x: +c.x.toFixed(3), y: +c.y.toFixed(3), out: c.out })),
      match: gs.match,
      matchWins: gs.matchWins,
      turn: gs.turn,
      phase: gs.phase,
      roundIdx: gs.roundIdx,
      matchIdx: gs.matchIdx,
      bracket: gs.bracket,
      totalRounds: gs.bracket.length,
      over: gs.over,
      champion: gs.champion,
      log: gs.log,
      board: BOARD,
      r: R,
    };
  },
  priv(gs: GS, pid: string) {
    const inMatch = !!gs.match && (gs.match.a === pid || gs.match.b === pid);
    return {
      myTurn: gs.turn === pid && inMatch && !gs.over,
      mySide: gs.match && gs.match.a === pid ? 0 : 1,
      inMatch,
      isBot: !!gs.bots[pid],
    };
  },
  rank(gs: GS) {
    const out: string[] = [];
    if (gs.champion) out.push(gs.champion);
    const finals = gs.bracket.length > 1 ? gs.bracket[gs.bracket.length - 1] : [];
    void finals;
    for (const p of gs.pids) if (!out.includes(p)) out.push(p);
    return out;
  },
};

export default mod;
