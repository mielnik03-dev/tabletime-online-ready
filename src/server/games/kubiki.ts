import { GameModule, Player } from "../types";

export const CATS = [
  { id: "ones", label: "Единицы" },
  { id: "twos", label: "Двойки" },
  { id: "threes", label: "Тройки" },
  { id: "fours", label: "Четвёрки" },
  { id: "fives", label: "Пятёрки" },
  { id: "sixes", label: "Шестёрки" },
  { id: "three", label: "Тройка" },
  { id: "four", label: "Каре" },
  { id: "fh", label: "Фулл-хаус" },
  { id: "small", label: "Малый стрит" },
  { id: "large", label: "Большой стрит" },
  { id: "chance", label: "Шанс" },
  { id: "yahtzee", label: "Пять одинаковых" },
] as const;

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  order: string[];
  round: number;
  cur: number;
  dice: number[] | null;
  kept: boolean[];
  rolls: number;
  scores: Record<string, Record<string, number | null>>;
  over: boolean;
  log: string[];
  botNext: Record<string, number>;
};

const d6 = () => 1 + Math.floor(Math.random() * 6);

function scoreCat(dice: number[], cat: string): number {
  const sum = dice.reduce((a, b) => a + b, 0);
  const cnt = (v: number) => dice.filter((x) => x === v).length;
  const counts = [1, 2, 3, 4, 5, 6].map(cnt);
  const max = Math.max(...counts);
  const has = (seq: number[]) => seq.every((v) => cnt(v) > 0);
  switch (cat) {
    case "ones": return sumOf(dice, 1);
    case "twos": return sumOf(dice, 2);
    case "threes": return sumOf(dice, 3);
    case "fours": return sumOf(dice, 4);
    case "fives": return sumOf(dice, 5);
    case "sixes": return sumOf(dice, 6);
    case "three": return max >= 3 ? sum : 0;
    case "four": return max >= 4 ? sum : 0;
    case "fh": return max === 3 && counts.includes(2) ? 25 : 0;
    case "small": return has([3, 4, 5, 6]) || has([2, 3, 4, 5]) ? 30 : 0;
    case "large": return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0;
    case "chance": return sum;
    case "yahtzee": return max === 5 ? 50 : 0;
    default: return 0;
  }
}
function sumOf(dice: number[], v: number): number {
  return dice.filter((x) => x === v).reduce((a, b) => a + b, 0);
}
function total(gs: GS, pid: string): number {
  return Object.values(gs.scores[pid]).reduce<number>((a, b) => a + (b ?? 0), 0);
}
function available(gs: GS, pid: string): string[] {
  return CATS.filter((c) => gs.scores[pid][c.id] === null).map((c) => c.id);
}

const mod: GameModule = {
  id: "kubiki",
  title: "Кубики",
  tag: "Покер на кубиках",
  desc: "13 категорий, до 3 бросков за ход. Побеждает по сумме очков.",
  min: 2,
  max: 6,
  create(players: Player[]) {
    const scores: Record<string, Record<string, number | null>> = {};
    players.forEach((p) => {
      scores[p.id] = {};
      CATS.forEach((c) => (scores[p.id][c.id] = null));
    });
    return {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      order: players.map((p) => p.id),
      round: 1,
      cur: 0,
      dice: null,
      kept: [false, false, false, false, false],
      rolls: 0,
      scores,
      over: false,
      log: [`Раунд 1: ходит ${players[0].name}`],
      botNext: {},
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) throw new Error("Игра окончена");
    if (gs.order[gs.cur] !== pid) throw new Error("Сейчас не твой ход");
    if (a.type === "roll") {
      if (!gs.dice) {
        gs.dice = [d6(), d6(), d6(), d6(), d6()];
        gs.rolls = 1;
      } else {
        if (gs.rolls >= 3) throw new Error("Бросков больше нет");
        gs.dice = gs.dice.map((d, i) => (gs.kept[i] ? d : d6()));
        gs.rolls++;
      }
    } else if (a.type === "keep") {
      const i = Number(a.i);
      if (i < 0 || i > 4 || !gs.dice) throw new Error("Нет такого кубика");
      gs.kept[i] = !gs.kept[i];
    } else if (a.type === "score") {
      if (!gs.dice) throw new Error("Сначала брось");
      const cat = a.cat === null ? null : String(a.cat);
      if (cat) {
        if (!available(gs, pid).includes(cat)) throw new Error("Категория уже использована");
        const pts = scoreCat(gs.dice, cat);
        gs.scores[pid][cat] = pts;
        gs.log = [`${gs.names[pid]}: ${CATS.find((c) => c.id === cat)?.label} — ${pts}`, ...gs.log].slice(0, 5);
      } else {
        gs.log = [`${gs.names[pid]} пропускает`, ...gs.log].slice(0, 5);
      }
      gs.dice = null;
      gs.kept = [false, false, false, false, false];
      gs.rolls = 0;
      gs.cur = (gs.cur + 1) % gs.order.length;
      if (gs.cur === 0) {
        gs.round++;
        if (gs.round > 13) {
          gs.over = true;
          gs.log = ["Все раунды сыграны — считаем очки", ...gs.log].slice(0, 5);
          return;
        }
        gs.log = [`Раунд ${gs.round}`, ...gs.log].slice(0, 5);
      }
    } else throw new Error("Неизвестное действие");
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over) return;
    const pid = gs.order[gs.cur];
    if (!gs.bots[pid]) return;
    if (!gs.botNext[pid]) gs.botNext[pid] = now + 1200 + Math.random() * 2200;
    if (now < gs.botNext[pid]) return;
    try {
      if (!gs.dice) {
        mod.act(gs, pid, { type: "roll" });
        gs.botNext[pid] = now + 1800;
        return;
      }
      // решить: ещё бросить или записать
      const counts = [1, 2, 3, 4, 5, 6].map((v) => gs.dice!.filter((x) => x === v).length);
      const max = Math.max(...counts);
      const wantRoll = gs.rolls < 3 && max < 3 && Math.random() < 0.6;
      if (wantRoll) {
        // держим парные и максимальные
        const bestV = counts.indexOf(max);
        gs.dice.forEach((d, i) => {
          if (d === bestV + 1 || counts[d - 1] >= 2) gs.kept[i] = true;
        });
        mod.act(gs, pid, { type: "roll" });
        gs.botNext[pid] = now + 1800;
        return;
      }
      const av = available(gs, pid);
      let best: string | null = av.length ? null : null;
      let bestPts = -1;
      for (const c of av) {
        const p = scoreCat(gs.dice, c);
        if (p > bestPts) { bestPts = p; best = c; }
      }
      mod.act(gs, pid, { type: "score", cat: best });
      gs.botNext[pid] = 0;
    } catch {
      gs.botNext[pid] = 0;
    }
  },
  pub(gs: GS) {
    return {
      order: gs.order,
      cur: gs.order[gs.cur],
      round: gs.round,
      scores: gs.scores,
      totals: Object.fromEntries(gs.order.map((p) => [p, total(gs, p)])),
      over: gs.over,
      log: gs.log,
      cats: CATS,
    };
  },
  priv(gs: GS, pid: string) {
    const myTurn = gs.order[gs.cur] === pid && !gs.over;
    return {
      myTurn,
      myDice: myTurn ? gs.dice : null,
      myKept: myTurn ? gs.kept : [false, false, false, false, false],
      myRolls: myTurn ? gs.rolls : 0,
      myAvailable: myTurn ? available(gs, pid) : [],
    };
  },
  rank(gs: GS) {
    return [...gs.order].sort((a, b) => total(gs, b) - total(gs, a));
  },
};

export default mod;
