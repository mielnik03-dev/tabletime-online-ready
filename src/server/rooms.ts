import { Room, Player, uid, roomCode, TOURNAMENT_ORDER } from "./types";
import { GAMES } from "./games";

const rooms = new Map<string, Room>();

export const BOT_PRESETS = [
  { name: "Бот Бумеранг", emoji: "🤖", color: "#e5484d" },
  { name: "Бот Пиксель", emoji: "👾", color: "#f5a524" },
  { name: "Бот Тик-Так", emoji: "⏰", color: "#3f9d6e" },
  { name: "Бот Комета", emoji: "☄️", color: "#4f9de5" },
  { name: "Бот Громила", emoji: "🦏", color: "#9a6fe0" },
  { name: "Бот Шарик", emoji: "🪩", color: "#e579b0" },
  { name: "Бот Вихрь", emoji: "🌀", color: "#3ec6b8" },
];

export function getRoom(code: string): Room | undefined {
  return rooms.get((code ?? "").toUpperCase().trim());
}

export function allRooms(): Room[] {
  return [...rooms.values()];
}

export function createRoom(): Room {
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  const room: Room = {
    code,
    v: 0,
    hostId: null,
    players: new Map(),
    tokens: new Map(),
    chat: [],
    phase: "lobby",
    selectedGame: null,
    game: null,
    tournament: null,
    clients: new Map(),
    dirty: true,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  ensureLoop();
  return room;
}

export function touch(room: Room) {
  room.v++;
  room.dirty = true;
}

export function saySystem(room: Room, text: string) {
  room.chat.push({ id: uid("m"), author: "system", text, ts: Date.now(), system: true });
  if (room.chat.length > 60) room.chat = room.chat.slice(-60);
}

export function humans(room: Room): Player[] {
  return [...room.players.values()].filter((p) => !p.isBot);
}

// ---------- протокол действий ----------
export function applyAction(room: Room, token: string, a: any): { me?: Player; gone?: boolean } {
  const pid = room.tokens.get(token) ?? null;
  const me = pid ? room.players.get(pid) ?? null : null;
  const isHost = !!me && room.hostId === me.id;

  switch (a.type) {
    case "join": {
      if (!me) {
        if (room.players.size >= 8) throw new Error("Комната заполнена (8 игроков)");
        const name = String(a.name ?? "").trim().slice(0, 20);
        if (!name) throw new Error("Введите имя");
        const p: Player = {
          id: uid("p"),
          name,
          color: String(a.color ?? "#f5a524"),
          emoji: String(a.emoji ?? "🙂"),
          isBot: false,
          connected: true,
          joinedAt: Date.now(),
        };
        room.players.set(p.id, p);
        room.tokens.set(token, p.id);
        if (!room.hostId || !room.players.has(room.hostId)) room.hostId = p.id;
        saySystem(room, `${p.name} за столом`);
        return { me: p };
      }
      me.connected = true;
      return { me };
    }
    case "leave": {
      if (!me) return {};
      room.players.delete(me.id);
      for (const [t, p] of room.tokens) if (p === me.id) room.tokens.delete(t);
      if (room.hostId === me.id) {
        const next = humans(room)[0];
        room.hostId = next ? next.id : null;
        if (room.hostId) saySystem(room, `Ведущий теперь ${next.name}`);
      }
      if (!humans(room).length) {
        rooms.delete(room.code);
        return { gone: true };
      }
      saySystem(room, `${me.name} ушёл`);
      break;
    }
    case "host": {
      if (!isHost) throw new Error("Права ведущего может передать только ведущий");
      const target = room.players.get(String(a.playerId));
      if (!target || target.isBot) throw new Error("Выбери игрока");
      room.hostId = target.id;
      saySystem(room, `Ведущий теперь ${target.name}`);
      break;
    }
    case "bot": {
      if (!isHost) throw new Error("Ботов добавляет ведущий");
      if (room.players.size >= 8) throw new Error("Комната заполнена");
      const used = new Set([...room.players.values()].map((p) => p.name));
      const preset = BOT_PRESETS.find((b) => !used.has(b.name)) ?? BOT_PRESETS[room.players.size % BOT_PRESETS.length];
      const b: Player = { id: uid("b"), name: preset.name, color: preset.color, emoji: preset.emoji, isBot: true, connected: true, joinedAt: Date.now() };
      room.players.set(b.id, b);
      saySystem(room, `${b.name} присоединяется`);
      break;
    }
    case "bot-del": {
      if (!isHost) throw new Error("Ботов удаляет ведущий");
      const target = room.players.get(String(a.playerId));
      if (!target?.isBot) throw new Error("Это не бот");
      room.players.delete(target.id);
      for (const [t, p] of room.tokens) if (p === target.id) room.tokens.delete(t);
      saySystem(room, `${target.name} покидает стол`);
      break;
    }
    case "chat": {
      if (!me) throw new Error("Сначала войди в комнату");
      const text = String(a.text ?? "").trim().slice(0, 300);
      if (!text) throw new Error("Пустое сообщение");
      room.chat.push({ id: uid("m"), author: me.id, text, ts: Date.now() });
      if (room.chat.length > 60) room.chat = room.chat.slice(-60);
      const mod = room.game && !room.game.finished ? GAMES[room.game.id] : null;
      if (mod?.onChat) {
        try { mod.onChat(room.game!.state, me.id, text, (t) => saySystem(room, t)); } catch { /* ignore */ }
      }
      break;
    }
    case "select": {
      if (!isHost || room.phase !== "lobby") throw new Error("Выбирать игру может ведущий в лобби");
      const id = a.gameId === null || a.gameId === undefined ? "" : String(a.gameId);
      if (id === "") {
        room.selectedGame = null;
        break;
      }
      if (!GAMES[id]) throw new Error("Нет такой игры");
      room.selectedGame = id;
      break;
    }
    case "start": {
      if (!isHost) throw new Error("Игру запускает ведущий");
      if (room.phase !== "lobby" && room.phase !== "results" && room.phase !== "final")
        throw new Error("Сейчас нельзя начать игру");
      let id: string;
      if (a.tournament) {
        id = TOURNAMENT_ORDER[0];
        const standings: Record<string, number> = {};
        room.players.forEach((p) => (standings[p.id] = 0));
        room.tournament = { active: true, done: false, round: 0, order: [...TOURNAMENT_ORDER], standings, results: [] };
        saySystem(room, `Турнир! 8 игр, старт — «${GAMES[id].title}»`);
      } else {
        id = String(a.gameId ?? room.selectedGame ?? "");
        if (!GAMES[id]) throw new Error("Выбери игру");
        room.tournament = null;
      }
      startGame(room, id);
      break;
    }
    case "restart": {
      if (!isHost) throw new Error("Перезапускает ведущий");
      if (!room.game) throw new Error("Игра не запущена");
      startGame(room, room.game.id);
      saySystem(room, `Перезапуск: «${GAMES[room.game.id].title}»`);
      break;
    }
    case "lobby": {
      if (!isHost) throw new Error("В лобби возвращает ведущий");
      room.game = null;
      room.phase = "lobby";
      room.selectedGame = null;
      if (room.tournament && room.tournament.done) room.tournament = null;
      break;
    }
    case "next": {
      if (!isHost || room.phase !== "results") throw new Error("Продолжает ведущий");
      if (room.tournament && room.tournament.active) {
        if (room.tournament.round >= TOURNAMENT_ORDER.length) {
          room.tournament.active = false;
          room.tournament.done = true;
          room.phase = "final";
        } else {
          try {
            startGame(room, TOURNAMENT_ORDER[room.tournament.round]);
            saySystem(room, `Игра ${room.tournament.round + 1} из 8: «${GAMES[TOURNAMENT_ORDER[room.tournament.round]].title}»`);
          } catch (e: any) {
            saySystem(room, `Следующую игру не удалось начать: ${e?.message ?? "ошибка"}. Добавь игроков или вернись в лобби.`);
          }
        }
      } else {
        room.game = null;
        room.phase = "lobby";
        room.selectedGame = null;
      }
      break;
    }
    case "game": {
      if (!me) throw new Error("Сначала войди в комнату");
      if (!room.game || room.game.finished) throw new Error("Игра не идёт");
      const mod = GAMES[room.game.id];
      mod.act(room.game.state, me.id, a.a);
      if (room.game.state.over) finishGame(room);
      break;
    }
    default:
      throw new Error("Неизвестное действие");
  }
  touch(room);
  broadcast(room);
  return { me };
}

export function startGame(room: Room, id: string) {
  const mod = GAMES[id];
  if (!mod) throw new Error("Нет такой игры");
  let players = [...room.players.values()];
  if (players.length < mod.min) throw new Error(`Нужно минимум ${mod.min} игрока`);
  if (players.length > mod.max) {
    // режим турнира: берём первых N (человеки приоритетнее ботов)
    players = [
      ...players.filter((p) => !p.isBot),
      ...players.filter((p) => p.isBot),
    ].slice(0, mod.max);
    saySystem(room, `В «${mod.title}» играют ${players.length} (лимит игры): ${players.map((p) => p.name).join(", ")}`);
  }
  room.game = { id, state: mod.create(players), finished: false, rank: null, points: null };
  room.phase = "playing";
  room.selectedGame = null;
  saySystem(room, `Началась игра «${mod.title}»`);
}

export function finishGame(room: Room) {
  if (!room.game) return;
  const mod = GAMES[room.game.id];
  const rank = mod.rank(room.game.state);
  room.game.rank = rank;
  let points: Record<string, number>;
  if (mod.points) {
    points = mod.points(room.game.state);
  } else {
    points = {};
    rank.forEach((pid, i) => (points[pid] = i === 0 ? 5 : i === 1 ? 3 : i === 2 ? 2 : 1));
  }
  room.game.points = points;
  room.game.finished = true;
  room.phase = "results";
  const winners = rank.slice(0, Math.min(3, rank.length)).map((p) => nameOf(room, p));
  saySystem(room, `«${mod.title}» окончена. Лучшие: ${winners.join(", ")}`);
  const t = room.tournament;
  if (t && t.active) {
    for (const [pid, pts] of Object.entries(points)) t.standings[pid] = (t.standings[pid] ?? 0) + pts;
    t.results.push({ id: room.game.id, title: mod.title, points, winners: rank.slice(0, Math.min(2, rank.length)) });
    t.round++;
    if (t.round >= t.order.length) {
      t.done = true;
      saySystem(room, "Все 8 игр сыграны — турнир завершён!");
    }
  }
}

function nameOf(room: Room, pid: string): string {
  return room.players.get(pid)?.name ?? "?";
}

// ---------- просмотр ----------
export function buildView(room: Room, token: string): any {
  const pid = room.tokens.get(token) ?? null;
  const me = pid ? room.players.get(pid) ?? null : null;
  let gameView = null;
  if (room.game) {
    const mod = GAMES[room.game.id];
    const inGame = pid ? !!room.game.state?.pids?.includes(pid) : false;
    gameView = {
      id: room.game.id,
      title: mod.title,
      gs: mod.pub(room.game.state),
      you: inGame ? mod.priv(room.game.state, pid!) : null,
      finished: room.game.finished,
      rank: room.game.rank,
      points: room.game.points,
    };
  }
  return {
    me,
    room: {
      code: room.code,
      v: room.v,
      phase: room.phase,
      hostId: room.hostId ?? "",
      players: [...room.players.values()],
      chat: room.chat,
      selectedGame: room.selectedGame,
      game: gameView,
      tournament: room.tournament,
    },
  };
}

// ---------- цикл: таймеры, боты, broadcast ----------
let loopStarted = false;
function ensureLoop() {
  if (loopStarted) return;
  loopStarted = true;
  const iv = setInterval(tickAll, 200);
  iv.unref?.();
}

function tickAll() {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.game && !room.game.finished) {
      const mod = GAMES[room.game.id];
      try {
        mod.bots?.(room.game.state, room, now);
        mod.tick?.(room.game.state, now);
        if (room.game.state.over) finishGame(room);
      } catch (e) {
        /* игра не должна ронять сервер */
      }
    }
    if (room.dirty) broadcast(room);
  }
}

export function broadcast(room: Room) {
  if (!room.dirty || room.clients.size === 0) return;
  for (const c of room.clients.values()) {
    try {
      c.push(`data: ${JSON.stringify(buildView(room, c.token))}\n\n`);
    } catch {
      room.clients.delete(c.key);
    }
  }
  room.dirty = false;
}

export function attachClient(room: Room, token: string, push: (s: string) => void): { key: string; detach: () => void } {
  const key = token + ":" + uid("c");
  room.clients.set(key, { id: key, push, token, key });
  const view = JSON.stringify(buildView(room, token));
  push(`data: ${view}\n\n`);
  room.dirty = false;
  return {
    key,
    detach: () => {
      room.clients.delete(key);
    },
  };
}
