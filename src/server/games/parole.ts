import { GameModule, Player, norm, shuffle } from "../types";
import { WORDS_PLAIN, HINT_WORDS, relatedWord } from "../words";

const TARGET = 15;

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  teams: [string[], string[]];
  wordFor: 0 | 1; // у какой команды секретное слово
  word: string;
  hints: string[];
  score: [number, number];
  round: number;
  over: boolean;
  log: string[];
  botNext: Record<string, number>;
};

const hintOf = (gs: GS) => (gs.wordFor === 0 ? 1 : 0);
function newWord(gs: GS) {
  let w = WORDS_PLAIN[Math.floor(Math.random() * WORDS_PLAIN.length)];
  while (w === gs.word) w = WORDS_PLAIN[Math.floor(Math.random() * WORDS_PLAIN.length)];
  gs.word = w;
}
function swapRound(gs: GS, msg: string) {
  gs.wordFor = hintOf(gs);
  newWord(gs);
  gs.hints = [];
  gs.round++;
  gs.log = [msg, ...gs.log].slice(0, 5);
}

const mod: GameModule = {
  id: "parole",
  title: "Пароль",
  tag: "Командная, подсказки",
  desc: "Одно слово-подсказка, 4 попытки, игра до 15 очков.",
  min: 3,
  max: 8,
  team: true,
  create(players: Player[]) {
    const half = Math.ceil(players.length / 2);
    const words = shuffle(WORDS_PLAIN);
    const gs: GS = {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      teams: [players.slice(0, half).map((p) => p.id), players.slice(half).map((p) => p.id)] as [string[], string[]],
      wordFor: 0,
      word: words[0],
      hints: [],
      score: [0, 0],
      round: 1,
      over: false,
      log: ["Команда 1 загадала слово, команда 2 подсказывает"],
      botNext: {},
    };
    return gs;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) throw new Error("Игра окончена");
    const myTeam = gs.teams[0].includes(pid) ? 0 : 1;
    if (a.type === "hint") {
      if (myTeam !== hintOf(gs)) throw new Error("Сейчас подсказывает другая команда");
      const h = String(a.text ?? "").trim();
      if (!/^[a-zA-Zа-яёА-ЯЁ-]+$/.test(h) || h.length > 25)
        throw new Error("Подсказка — ровно одно слово");
      if (relatedWord(h, gs.word)) throw new Error("Подсказка слишком близка к ответу");
      if (gs.hints.some((x) => norm(x) === norm(h))) throw new Error("Эта подсказка уже была");
      gs.hints.push(h);
      gs.log = [`Подсказка ${gs.hints.length}: «${h}»`, ...gs.log].slice(0, 5);
      if (gs.hints.length >= 4) swapRound(gs, "4 подсказки без угадывания — 0 очков, меняемся");
    } else if (a.type === "guess") {
      if (myTeam !== gs.wordFor) throw new Error("Угадывает команда с секретным словом");
      const g = String(a.text ?? "").trim();
      if (!g) throw new Error("Введите слово");
      if (norm(g) === norm(gs.word)) {
        const pts = 5 - gs.hints.length;
        gs.score[gs.wordFor] += pts;
        gs.log = [`${gs.names[pid]} угадал «${gs.word}» (+${pts})`, ...gs.log].slice(0, 5);
        if (gs.score[gs.wordFor] >= TARGET) {
          gs.over = true;
          gs.log = [`Команда ${gs.wordFor + 1} набрала ${TARGET} очков!`, ...gs.log].slice(0, 5);
          return;
        }
        swapRound(gs, "Меняемся ролями");
      }
    } else throw new Error("Неизвестное действие");
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over) return;
    const hTeam = hintOf(gs);
    for (const p of gs.teams[hTeam]) {
      if (!gs.bots[p] || gs.hints.length >= 4) continue;
      if (!gs.botNext[p]) gs.botNext[p] = now + 2500 + Math.random() * 3000;
      if (now < gs.botNext[p]) continue;
      gs.botNext[p] = 0;
      const opts = HINT_WORDS.filter((h) => !relatedWord(h, gs.word) && !gs.hints.some((x) => norm(x) === norm(h)));
      if (opts.length) mod.act(gs, p, { type: "hint", text: opts[Math.floor(Math.random() * opts.length)] });
    }
    for (const p of gs.teams[gs.wordFor]) {
      if (!gs.bots[p]) continue;
      if (!gs.botNext["g" + p]) gs.botNext["g" + p] = now + 3000 + Math.random() * 3500;
      if (now < gs.botNext["g" + p]) continue;
      gs.botNext["g" + p] = 0;
      if (Math.random() < 0.4) mod.act(gs, p, { type: "guess", text: gs.word });
      else mod.act(gs, p, { type: "guess", text: WORDS_PLAIN[Math.floor(Math.random() * WORDS_PLAIN.length)] });
    }
  },
  pub(gs: GS) {
    return {
      teams: gs.teams,
      wordFor: gs.wordFor,
      hintFor: hintOf(gs),
      hints: gs.hints,
      score: gs.score,
      round: gs.round,
      over: gs.over,
      target: TARGET,
      log: gs.log,
    };
  },
  priv(gs: GS, pid: string) {
    const myTeam = gs.teams[0].includes(pid) ? 0 : 1;
    return { myTeam, myWord: myTeam === gs.wordFor ? gs.word : null, isHinting: myTeam === hintOf(gs) };
  },
  rank(gs: GS) {
    const [a, b] = gs.score;
    const win: [string[], string[]] = a >= b ? [gs.teams[0], gs.teams[1]] : [gs.teams[1], gs.teams[0]];
    return [...win[0], ...win[1]];
  },
  points(gs: GS) {
    const [a, b] = gs.score;
    const out: Record<string, number> = {};
    gs.teams[0].forEach((p) => (out[p] = a === b ? 5 : a > b ? 5 : 3));
    gs.teams[1].forEach((p) => (out[p] = a === b ? 5 : a < b ? 5 : 3));
    return out;
  },
};

export default mod;
