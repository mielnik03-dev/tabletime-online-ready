import { GameModule, Player } from "../types";

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  dice: Record<string, number[]>;
  order: string[];
  cur: number;
  bid: { count: number; value: number; by: string } | null;
  over: boolean;
  winner: string | null;
  log: string[];
  botNext: Record<string, number>;
};

const VALNAMES = ["", "единицы", "двойки", "тройки", "четвёрки", "пятёрки", "шестёрки"];
const die = () => 1 + Math.floor(Math.random() * 6);

function alive(gs: GS): string[] {
  return gs.order.filter((p) => gs.dice[p].length > 0);
}
function nextAlive(gs: GS, fromPid: string): string {
  const a = alive(gs);
  if (a.length === 0) return fromPid;
  const i = a.indexOf(fromPid);
  return a[(i + 1) % a.length];
}
function countMatch(gs: GS, value: number): number {
  let n = 0;
  for (const p of gs.order)
    for (const d of gs.dice[p]) {
      if (value === 1) { if (d === 1) n++; }
      else if (d === value || d === 1) n++;
    }
  return n;
}

const mod: GameModule = {
  id: "perudo",
  title: "Перудо",
  tag: "Блеф с кубиками",
  desc: "5 кубиков, ставки и «Не верю». Потерял все кости — выбыл.",
  min: 2,
  max: 6,
  create(players: Player[]) {
    const order = players.map((p) => p.id);
    const dice: Record<string, number[]> = {};
    players.forEach((p) => (dice[p.id] = [die(), die(), die(), die(), die()]));
    return {
      pids: order,
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      dice,
      order,
      cur: Math.floor(Math.random() * order.length),
      bid: null as GS["bid"],
      over: false,
      winner: null as string | null,
      log: ["Бросаем кости, начинаем блефовать"],
      botNext: {} as Record<string, number>,
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) throw new Error("Игра окончена");
    if (!gs.dice[pid]?.length) throw new Error("У тебя нет костей");
    if (gs.order[gs.cur] !== pid) throw new Error("Сейчас не твой ход");
    if (a.type === "bid") {
      const count = Number(a.count), value = Number(a.value);
      if (!Number.isInteger(count) || !Number.isInteger(value) || value < 1 || value > 6 || count < 1 || count > 25)
        throw new Error("Некорректная ставка");
      if (!gs.bid && count < 2) throw new Error("Первая ставка — минимум 2 штуки");
      if (gs.bid && !(count > gs.bid.count || (count === gs.bid.count && value > gs.bid.value)))
        throw new Error("Ставка должна быть выше текущей");
      gs.bid = { count, value, by: pid };
      gs.log = [`${gs.names[pid]}: ${count} ${VALNAMES[value]}`, ...gs.log].slice(0, 6);
      gs.cur = gs.order.indexOf(nextAlive(gs, pid));
    } else if (a.type === "doubt") {
      if (!gs.bid) throw new Error("Оспаривать нечего");
      const bidder = gs.bid.by;
      const good = countMatch(gs, gs.bid.value) >= gs.bid.count;
      const loser = good ? pid : bidder;
      gs.dice[loser].pop();
      gs.log = [
        `${good ? "Ставка верна" : "Ставка ложна"}: ${gs.names[loser]} теряет кость`,
        ...gs.log,
      ].slice(0, 6);
      gs.bid = null;
      if (gs.dice[loser].length === 0) gs.log = [`${gs.names[loser]} выбыл из игры`, ...gs.log].slice(0, 6);
      const a2 = alive(gs);
      if (a2.length === 1) {
        gs.over = true;
        gs.winner = a2[0];
        gs.log = [`${gs.names[a2[0]]} — победитель!`, ...gs.log].slice(0, 6);
      } else {
        gs.cur = gs.order.indexOf(nextAlive(gs, pid));
      }
    } else throw new Error("Неизвестное действие");
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over) return;
    const pid = gs.order[gs.cur];
    if (!gs.bots[pid]) return;
    if (!gs.botNext[pid]) gs.botNext[pid] = now + 1500 + Math.random() * 2500;
    if (now < gs.botNext[pid]) return;
    gs.botNext[pid] = 0;
    try {
      if (gs.bid && Math.random() < 0.15) {
        mod.act(gs, pid, { type: "doubt" });
        return;
      }
      const count = gs.bid ? Math.min(25, gs.bid.count + 1) : 2 + Math.floor(Math.random() * 2);
      const value = gs.bid ? (gs.bid.value === 6 ? 5 : gs.bid.value + 1) : Math.random() < 0.5 ? 5 : 6;
      const valid =
        (!gs.bid && count >= 2) ||
        (gs.bid && (count > gs.bid.count || (count === gs.bid.count && value > gs.bid.value)));
      if (count > 25 || !valid) mod.act(gs, pid, { type: "doubt" });
      else mod.act(gs, pid, { type: "bid", count, value });
    } catch {
      /* бот не смог — до следующего тика */
    }
  },
  pub(gs: GS) {
    return {
      order: gs.order,
      cur: gs.order[gs.cur],
      bid: gs.bid ? { count: gs.bid.count, value: gs.bid.value, by: gs.bid.by } : null,
      diceCount: Object.fromEntries(gs.order.map((p) => [p, gs.dice[p].length])),
      alive: alive(gs),
      over: gs.over,
      winner: gs.winner,
      log: gs.log,
    };
  },
  priv(gs: GS, pid: string) {
    return { myDice: [...(gs.dice[pid] ?? [])], myTurn: gs.order[gs.cur] === pid && !gs.over };
  },
  rank(gs: GS) {
    const a = alive(gs);
    const sorted = [...a].sort((x, y) => gs.dice[y].length - gs.dice[x].length);
    const out: string[] = gs.winner ? [gs.winner] : [];
    for (const p of sorted) if (!out.includes(p)) out.push(p);
    for (const p of gs.order) if (!out.includes(p)) out.push(p);
    return out;
  },
};

export default mod;
