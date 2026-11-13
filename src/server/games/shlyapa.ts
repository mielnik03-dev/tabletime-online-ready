import { GameModule, Player, norm, shuffle } from "../types";
import { SHLYAPA_WORDS, explicitForbid, WORDS_PLAIN } from "../words";

const ROUND_MODES = ["Объяснение словами", "Жесты", "Одно слово"];
const TURN_MS = 60000;

type GS = {
  pids: string[];
  names: Record<string, string>;
  bots: Record<string, boolean>;
  teams: [string[], string[]];
  round: number; // 0..2
  turn: 0 | 1;
  words: string[];
  wordIdx: number;
  scores: [number, number];
  deadline: number;
  wrongs: number;
  over: boolean;
  botNext: Record<string, number>;
  log: string[];
};

const word = (gs: GS) => gs.words[gs.wordIdx % gs.words.length];

const mod: GameModule = {
  id: "shlyapa",
  title: "Шляпа",
  tag: "Командная словесная",
  desc: "3 раунда: слова, жесты, одно слово. 60 секунд на команду.",
  min: 3,
  max: 8,
  team: true,
  create(players: Player[]) {
    const half = Math.ceil(players.length / 2);
    const a = players.slice(0, half).map((p) => p.id);
    const b = players.slice(half).map((p) => p.id);
    const list = shuffle([...new Set(SHLYAPA_WORDS.map((x) => x.w))]);
    return {
      pids: players.map((p) => p.id),
      names: Object.fromEntries(players.map((p) => [p.id, p.name])),
      bots: Object.fromEntries(players.map((p) => [p.id, p.isBot])),
      teams: [a, b] as [string[], string[]],
      round: 0,
      turn: 0 as const,
      words: list,
      wordIdx: 0,
      scores: [0, 0] as [number, number],
      deadline: Date.now() + TURN_MS,
      wrongs: 0,
      over: false,
      botNext: {},
      log: [],
    } as GS;
  },
  act(gs: GS, pid: string, a: any) {
    if (gs.over) return;
    const team = gs.teams[0].includes(pid) ? 0 : 1;
    if (team !== gs.turn) throw new Error("Сейчас объясняет другая команда");
    const g = String(a.text ?? "").trim();
    if (!g) throw new Error("Введите слово");
    if (norm(g) === norm(word(gs))) {
      gs.scores[gs.turn]++;
      gs.wordIdx++;
      gs.log = [`${gs.names[pid]} угадал: ${word(gs).toUpperCase()} (+1)`, ...gs.log].slice(0, 5);
    } else {
      gs.wrongs++;
    }
  },
  onChat(gs: GS, pid: string, text: string, say: (t: string) => void) {
    if (gs.over) return;
    const team = gs.teams[0].includes(pid) ? 0 : 1;
    if (team !== gs.turn) return;
    if (gs.round === 1) {
      say(`Команде «${gs.teams[0].map((p) => gs.names[p]).join(", ")}»: в раунде жестов чат не читается`);
      return;
    }
    if (norm(text).includes(norm(word(gs)))) {
      gs.wordIdx++;
      say(`Внимание: слово-ответ написано в чат! Команда ${gs.turn + 1} пропустила слово`);
    }
  },
  tick(gs: GS, now: number) {
    if (gs.over) return;
    if (now < gs.deadline) return;
    if (gs.turn === 1) {
      if (gs.round === 2) { gs.over = true; return; }
      gs.round++;
      gs.turn = 0;
    } else {
      gs.turn = 1;
    }
    gs.wordIdx++;
    gs.deadline = now + TURN_MS;
    gs.log = [`Раунд ${gs.round + 1}: ${ROUND_MODES[gs.round]}, объясняет команда ${gs.turn + 1}`, ...gs.log].slice(0, 5);
  },
  bots(gs: GS, _room: any, now: number) {
    if (gs.over) return;
    for (const p of gs.teams[gs.turn]) {
      if (!gs.bots[p]) continue;
      if (!gs.botNext[p]) gs.botNext[p] = now + 2500 + Math.random() * 4000;
      if (now < gs.botNext[p]) continue;
      gs.botNext[p] = now + 2500 + Math.random() * 4000;
      const r = Math.random();
      if (r < 0.4) {
        gs.scores[gs.turn]++;
        gs.wordIdx++;
        gs.log = [`${gs.names[p]} угадал: ${word(gs).toUpperCase()} (+1)`, ...gs.log].slice(0, 5);
      } else if (r < 0.6) {
        gs.wrongs++;
      }
    }
  },
  pub(gs: GS) {
    return {
      teams: gs.teams,
      round: gs.round,
      mode: ROUND_MODES[gs.round],
      turn: gs.turn,
      scores: gs.scores,
      deadline: gs.deadline,
      wrongs: gs.wrongs,
      over: gs.over,
      log: gs.log,
      wordsTotal: gs.words.length,
    };
  },
  priv(gs: GS, pid: string) {
    const team = gs.teams[0].includes(pid) ? 0 : 1;
    return {
      myTeam: team,
      isPresenting: team === gs.turn && !gs.over,
      word: team === gs.turn ? word(gs) : null,
      round: gs.round,
    };
  },
  rank(gs: GS) {
    const [a, b] = gs.scores;
    const win: [string[], string[]] = a >= b ? [gs.teams[0], gs.teams[1]] : [gs.teams[1], gs.teams[0]];
    return [...win[0], ...win[1]];
  },
  points(gs: GS) {
    const [a, b] = gs.scores;
    const out: Record<string, number> = {};
    gs.teams[0].forEach((p) => (out[p] = a === b ? 5 : a > b ? 5 : 3));
    gs.teams[1].forEach((p) => (out[p] = a === b ? 5 : a < b ? 5 : 3));
    return out;
  },
};

export default mod;
