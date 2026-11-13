import { GameModule, Player, shuffle } from "../types";

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  cards: Record<string, number[][]>;
  drawn: number[];
  nextAt: number;
  marks: Record<string, number[]>;
  mode: Record<string, "manual" | "auto">;
  skip: Record<string, boolean>;
  lines: Record<string, number>;
  full: string | null;
  over: boolean;
  log: string[];
  botNext: Record<string, number>;
};

const INTERVAL = 5000;

function genCard(): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const cols = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5).sort((a, b) => a - b);
    rows.push(cols.map((c) => c * 10 + 1 + Math.floor(Math.random() * 9)));
  }
  return rows;
}
function cardHas(card: number[][], n: number): boolean {
  return card.some((row) => row.includes(n));
}
function completedRows(gs: GS, pid: string): number {
  return gs.cards[pid].filter((row) => row.every((n) => gs.drawn.includes(n))).length;
}

const mod: GameModule = {
  id: "loto",
  title: "Лото",
  tag: "Лото 90",
  desc: "90 чисел, линия и полное лото. Ложная заявка — штраф.",
  min: 2,
  max: 8,
  create(players: Player[]) {
    const cards: Record<string, number[][]> = {};
    const marks: Record<string, number[]> = {};
    const mode: Record<string, "manual" | "auto"> = {};
    players.forEach((p) => {
      cards[p.id] = genCard();
      marks[p.id] = [];
      mode[p.id] = p.isBot ? "auto" : "manual";
    });
    return {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      cards,
      drawn: [],
      nextAt: Date.now() + 2500,
      marks,
      mode,
      skip: Object.fromEntries(players.map((p) => [p.id, false])),
      lines: Object.fromEntries(players.map((p) => [p.id, 0])),
      full: null as string | null,
      over: false,
      log: ["Барабан крутится…"],
      botNext: {} as Record<string, number>,
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) throw new Error("Игра окончена");
    if (a.type === "mark") {
      const n = Number(a.n);
      if (!cardHas(gs.cards[pid], n)) throw new Error("Нет такого числа");
      if (!gs.drawn.includes(n)) throw new Error("Число ещё не вытаскивалось");
      if (!gs.marks[pid].includes(n)) gs.marks[pid].push(n);
    } else if (a.type === "mode") {
      if (a.mode !== "manual" && a.mode !== "auto") throw new Error("Неизвестный режим");
      gs.mode[pid] = a.mode;
      if (a.mode === "auto") {
        for (const n of gs.cards[pid].flat())
          if (gs.drawn.includes(n) && !gs.marks[pid].includes(n)) gs.marks[pid].push(n);
      }
    } else if (a.type === "claim") {
      const kind = a.kind === "full" ? "full" : "line";
      const card = gs.cards[pid];
      const doneRows = card.filter((row) => row.every((n) => gs.drawn.includes(n)));
      const isFull = card.flat().every((n) => gs.drawn.includes(n));
      if (kind === "full" && isFull) {
        gs.full = pid;
        gs.over = true;
        gs.log = [`ПОЛНОЕ ЛОТО у ${gs.names[pid]}!`, ...gs.log].slice(0, 5);
      } else if (kind === "line" && doneRows.length > gs.lines[pid]) {
        gs.lines[pid] = doneRows.length;
        gs.log = [`«Линия» у ${gs.names[pid]} (${gs.lines[pid]})`, ...gs.log].slice(0, 5);
      } else {
        gs.skip[pid] = true;
        gs.log = [`Штраф: ложная заявка — ${gs.names[pid]} пропустит следующее число`, ...gs.log].slice(0, 5);
      }
    } else throw new Error("Неизвестное действие");
  },
  tick(gs: GS, now: number) {
    if (gs.over) return;
    if (gs.drawn.length >= 90) {
      gs.over = true;
      gs.log = ["Все 90 чисел вытащены", ...gs.log].slice(0, 5);
      return;
    }
    if (now >= gs.nextAt) {
      const left = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !gs.drawn.includes(n));
      const n = left[Math.floor(Math.random() * left.length)];
      gs.drawn.push(n);
      gs.nextAt = now + INTERVAL;
      for (const p of gs.pids) {
        if (!cardHas(gs.cards[p], n)) continue;
        if (gs.mode[p] === "auto") {
          if (!gs.marks[p].includes(n)) gs.marks[p].push(n);
        } else if (gs.skip[p]) {
          gs.skip[p] = false;
          gs.marks[p].push(n);
          gs.log = [`${gs.names[p]} пропускает ${n} (штраф)`, ...gs.log].slice(0, 5);
        }
      }
      // боты сами заявляют
      for (const p of gs.pids) {
        if (!gs.bots[p] || gs.over) continue;
        const isFull = gs.cards[p].flat().every((x) => gs.drawn.includes(x));
        if (isFull) { mod.act(gs, p, { type: "claim", kind: "full" }); break; }
        if (completedRows(gs, p) > gs.lines[p]) { mod.act(gs, p, { type: "claim", kind: "line" }); break; }
      }
    }
  },
  pub(gs: GS) {
    return {
      pids: gs.pids,
      drawn: gs.drawn,
      last: gs.drawn[gs.drawn.length - 1] ?? null,
      nextAt: gs.nextAt,
      lines: gs.lines,
      full: gs.full,
      over: gs.over,
      mode: gs.mode,
      skip: gs.skip,
      log: gs.log,
    };
  },
  priv(gs: GS, pid: string) {
    return {
      myCard: gs.cards[pid],
      myMarks: gs.marks[pid],
      myMode: gs.mode[pid],
      myLines: gs.lines[pid],
    };
  },
  rank(gs: GS) {
    const sorted = [...gs.pids].sort((a, b) => {
      if (gs.full === a) return -1;
      if (gs.full === b) return 1;
      if (gs.lines[b] !== gs.lines[a]) return gs.lines[b] - gs.lines[a];
      return gs.marks[b].length - gs.marks[a].length;
    });
    return sorted;
  },
};

export default mod;
