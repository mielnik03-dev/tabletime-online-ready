import { GameModule, Player, shuffle } from "../types";

export type Card = { r: number; s: number; id: number };

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  hands: Record<string, Card[]>;
  rankIdx: number; // индекс в цикле туз,2,...,король
  cur: string;
  lastPlayer: string | null;
  pile: Card[];
  over: boolean;
  winner: string | null;
  log: string[];
  botNext: Record<string, number>;
};

export const RANK_CYCLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const RANK_NAME = ["", "Туз", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Валет", "Дама", "Король"];
const curRank = (gs: GS) => RANK_CYCLE[gs.rankIdx % 13];
const nextPid = (gs: GS, pid: string) => {
  const i = gs.pids.indexOf(pid);
  return gs.pids[(i + 1) % gs.pids.length];
};

const mod: GameModule = {
  id: "veryu",
  title: "Верю — не верю",
  tag: "Карточный блеф",
  desc: "Кладём карты рубашкой и заявляем ранг. Не поверил — вскрытие.",
  min: 2,
  max: 5,
  create(players: Player[]) {
    const deck: Card[] = [];
    for (let r = 1; r <= 13; r++) for (let s = 0; s < 4; s++) deck.push({ r, s, id: r * 4 + s });
    const shuffled = shuffle(deck);
    const hands: Record<string, Card[]> = {};
    players.forEach((p) => (hands[p.id] = []));
    shuffled.forEach((c, i) => hands[players[i % players.length].id].push(c));
    return {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      hands,
      rankIdx: 0,
      cur: players[Math.floor(Math.random() * players.length)].id,
      lastPlayer: null as string | null,
      pile: [] as Card[],
      over: false,
      winner: null as string | null,
      log: [`Текущий ранг: ${RANK_NAME[curRank({ rankIdx: 0 } as GS)]}`],
      botNext: {} as Record<string, number>,
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) throw new Error("Игра окончена");
    if (gs.cur !== pid) throw new Error("Сейчас не твой ход");
    if (a.type === "play") {
      if (gs.lastPlayer === pid) throw new Error("Ты только что ходил");
      const ids: number[] = (a.cards as number[]).map(Number);
      if (!ids.length || ids.length > 4) throw new Error("От 1 до 4 карт");
      const hand = gs.hands[pid];
      for (const id of ids) {
        const i = hand.findIndex((c) => c.id === id);
        if (i === -1) throw new Error("Нет такой карты в руке");
        gs.pile.push(hand.splice(i, 1)[0]);
      }
      gs.lastPlayer = pid;
      gs.log = [`${gs.names[pid]} кладёт ${ids.length} карт (заявка: ${RANK_NAME[curRank(gs)]})`, ...gs.log].slice(0, 5);
      if (gs.hands[pid].length === 0) {
        gs.over = true;
        gs.winner = pid;
        gs.log = [`${gs.names[pid]} сбросил все карты!`, ...gs.log].slice(0, 5);
        return;
      }
      gs.cur = nextPid(gs, pid);
    } else if (a.type === "doubt") {
      if (!gs.pile.length) throw new Error("Вскрывать нечего");
      if (gs.lastPlayer === pid) throw new Error("Нельзя оспаривать свой же ход");
      const truth = gs.pile.every((c) => c.r === curRank(gs));
      const taker = truth ? pid : (gs.lastPlayer as string);
      gs.hands[taker].push(...gs.pile);
      gs.log = [
        `${truth ? "Правда! " : "Ложь! "}Стопку забирает ${gs.names[taker]}. Ранг: ${RANK_NAME[curRank(gs)]} → ${RANK_NAME[RANK_CYCLE[(gs.rankIdx + 1) % 13]]}`,
        ...gs.log,
      ].slice(0, 5);
      gs.pile = [];
      gs.rankIdx++;
      gs.lastPlayer = null;
      gs.cur = nextPid(gs, pid);
    } else throw new Error("Неизвестное действие");
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over) return;
    const pid = gs.cur;
    if (!gs.bots[pid]) return;
    if (!gs.botNext[pid]) gs.botNext[pid] = now + 1500 + Math.random() * 2500;
    if (now < gs.botNext[pid]) return;
    gs.botNext[pid] = 0;
    try {
      if (gs.pile.length && gs.lastPlayer !== pid && Math.random() < 0.2) {
        mod.act(gs, pid, { type: "doubt" });
        return;
      }
      if (gs.lastPlayer === pid) return;
      const hand = gs.hands[pid];
      const real = hand.filter((c) => c.r === curRank(gs));
      const n = Math.min(1 + Math.floor(Math.random() * 2), hand.length);
      let take: Card[];
      if (real.length >= n) take = shuffle(real).slice(0, n);
      else take = [...shuffle(real), ...shuffle(hand.filter((c) => c.r !== curRank(gs)))].slice(0, n);
      mod.act(gs, pid, { type: "play", cards: take.map((c) => c.id) });
    } catch {
      /* до следующего тика */
    }
  },
  pub(gs: GS) {
    return {
      pids: gs.pids,
      cur: gs.cur,
      rank: curRank(gs),
      rankName: RANK_NAME[curRank(gs)],
      pileCount: gs.pile.length,
      lastPlayer: gs.lastPlayer,
      handCount: Object.fromEntries(gs.pids.map((p) => [p, gs.hands[p].length])),
      over: gs.over,
      winner: gs.winner,
      log: gs.log,
    };
  },
  priv(gs: GS, pid: string) {
    return {
      myHand: gs.hands[pid].map((c) => ({ r: c.r, s: c.s, id: c.id })),
      myTurn: gs.cur === pid && !gs.over,
      canDoubt: gs.cur === pid && gs.pile.length > 0 && gs.lastPlayer !== pid,
    };
  },
  rank(gs: GS) {
    const out: string[] = [];
    if (gs.winner) out.push(gs.winner);
    for (const p of [...gs.pids].sort((a, b) => gs.hands[a].length - gs.hands[b].length))
      if (!out.includes(p)) out.push(p);
    return out;
  },
};

export default mod;
