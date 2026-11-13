"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRoom } from "@/client/useRoom";
import { RULES, TOURNAMENT_RULES } from "@/client/rules";
import { setMuted, isMuted, snd } from "@/client/sound";
import { Avatar, Btn, CopyBtn, ConnDot, GameIcon, Modal, Panel, AVATAR_COLORS, AVATAR_EMOJIS } from "@/client/ui";
import Bonjour from "@/client/games/Bonjour";
import Shlyapa from "@/client/games/Shlyapa";
import Perudo from "@/client/games/Perudo";
import Loto from "@/client/games/Loto";
import Parole from "@/client/games/Parole";
import Veryu from "@/client/games/Veryu";
import Kubiki from "@/client/games/Kubiki";
import Chapayev from "@/client/games/Chapayev";

const GAME_UI: Record<string, any> = {
  bonjour: Bonjour, shlyapa: Shlyapa, perudo: Perudo, loto: Loto,
  parole: Parole, veryu: Veryu, kubiki: Kubiki, chapayev: Chapayev,
};

const GAME_META: Record<string, { title: string; min: number; max: number }> = {
  bonjour: { title: "Бонжур, мадам!", min: 2, max: 6 },
  shlyapa: { title: "Шляпа", min: 3, max: 8 },
  perudo: { title: "Перудо", min: 2, max: 6 },
  loto: { title: "Лото", min: 2, max: 8 },
  parole: { title: "Пароль", min: 3, max: 8 },
  veryu: { title: "Верю — не верю", min: 2, max: 5 },
  kubiki: { title: "Кубики", min: 2, max: 6 },
  chapayev: { title: "Чапаев", min: 2, max: 8 },
};
const GAME_ORDER = ["bonjour", "shlyapa", "perudo", "loto", "parole", "veryu", "kubiki", "chapayev"];

export default function RoomPage() {
  const code = useParams<{ code: string }>().code;
  const { view, conn, error, send } = useRoom(code);
  const [chatOpen, setChatOpen] = useState(false);
  const [muted, setMutedState] = useState(false);

  if (!view)
    return (
      <Center>
        <div className="w-10 h-10 rounded-full border-4 border-(--c-line) border-t-(--c-accent) animate-spin" />
        <p className="text-(--c-mut) mt-4 text-sm">Подключаемся к комнате {code}…</p>
      </Center>
    );

  if (view.gone)
    return (
      <Center>
        <div className="text-5xl mb-4" aria-hidden>🕯️</div>
        <h1 className="font-display text-xl mb-2">Комната закрыта</h1>
        <p className="text-(--c-mut) text-sm mb-6 max-w-xs text-center">
          Сервер перезапустился или все ушли. Создайте новую комнату и пришлите ссылку друзьям заново.
        </p>
        <Link href="/"><Btn variant="primary">На главную</Btn></Link>
      </Center>
    );

  if (!view.me) return <Join code={code} send={send} conn={conn} />;

  const room = view.room;
  const me = view.me;
  const isHost = room.hostId === me.id;
  const game = room.game;
  const GameComp = game ? GAME_UI[game.id] : null;

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
      {error && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] bg-[#e5484d] text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-[pop_.2s_ease-out]">
          {error}
        </div>
      )}
      <header className="flex items-center gap-3 flex-wrap">
        <Link href="/" className="font-display text-sm text-(--c-mut) hover:text-(--c-ink)">
          Вечер за столом
        </Link>
        <span className="rounded-lg bg-(--c-surf) border border-(--c-line) px-2.5 py-1 font-display text-sm tracking-[0.2em] text-(--c-accent)">
          {room.code}
        </span>
        <CopyBtn
          text={typeof window !== "undefined" ? window.location.origin + "/room/" + room.code : "/room/" + room.code}
          label="Ссылка-приглашение"
        />
        <div className="ml-auto flex items-center gap-3">
          <ConnDot conn={conn} />
          <button
            className="text-lg"
            title={muted ? "Включить звук" : "Выключить звук"}
            onClick={() => {
              const m = !muted;
              setMuted(m);
              setMutedState(m);
            }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <Btn variant="ghost" size="sm" onClick={() => send({ type: "leave" })}>Выйти</Btn>
        </div>
      </header>

      <div className="flex gap-4 flex-1 min-h-0">
        <main className="flex-1 min-w-0">
          {room.phase === "lobby" && (room.selectedGame ? (
            <Rules
              gameId={room.selectedGame}
              isHost={isHost}
              onBack={() => send({ type: "select", gameId: null })}
              onStart={(g: string) => send({ type: "start", gameId: g })}
            />
          ) : (
            <Lobby room={room} me={me} isHost={isHost} send={send} />
          ))}
          {room.phase === "playing" && game && GameComp && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <GameIcon id={game.id} />
                <h2 className="font-display text-lg">{game.title}</h2>
                {room.tournament?.active && (
                  <span className="text-xs bg-(--c-surf2) border border-(--c-line) rounded-full px-2.5 py-1 text-(--c-mut)">
                    Игра {room.tournament.round + 1} из 8
                  </span>
                )}
              </div>
              <GameComp gs={game.gs} you={game.you} me={me} room={room} send={send} />
            </div>
          )}
          {room.phase === "results" && <Results room={room} me={me} send={send} />}
          {room.phase === "final" && <Final room={room} me={me} send={send} />}
        </main>
        <aside className="hidden lg:flex w-80 flex-col shrink-0">
          <Chat room={room} me={me} send={send} />
        </aside>
      </div>

      <button
        className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-(--c-accent) text-[#241505] shadow-xl flex items-center justify-center"
        onClick={() => setChatOpen(true)}
        aria-label="Чат"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
      </button>
      {chatOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setChatOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 h-[70vh] rounded-t-3xl bg-(--c-bg) p-2" onClick={(e) => e.stopPropagation()}>
            <Chat room={room} me={me} send={send} onDone={() => setChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center px-6">{children}</div>;
}

// ---------- ВХОД ----------
function Join({ code, send, conn }: any) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("tn_profile_name") ?? ""; } catch { return ""; }
  });
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  return (
    <Center>
      <div className="w-full max-w-sm bg-(--c-surf) border border-(--c-line) rounded-3xl p-6">
        <h1 className="font-display text-xl mb-1">Заходи за стол</h1>
        <p className="text-sm text-(--c-mut) mb-5">
          Комната <b className="text-(--c-accent) tracking-widest">{code}</b>. Придумай имя и выбери аватар — регистрация не нужна.
        </p>
        <div className="flex justify-center mb-4">
          <Avatar name={name || "?"} color={color} emoji={emoji} size={72} />
        </div>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, 20));
            try { localStorage.setItem("tn_profile_name", e.target.value); } catch { /* ignore */ }
          }}
          placeholder="Твоё имя (1–20)"
          className="w-full bg-(--c-surf2) border border-(--c-line) rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-(--c-accent)"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {AVATAR_COLORS.map((c) => (
            <button key={c} className={"w-8 h-8 rounded-full transition-transform " + (color === c ? "scale-110 ring-2 ring-white/70" : "hover:scale-105")} style={{ background: c }} onClick={() => setColor(c)} aria-label="цвет" />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {AVATAR_EMOJIS.map((e) => (
            <button key={e} className={"w-10 h-10 rounded-xl text-xl transition-all " + (emoji === e ? "bg-(--c-accent22) scale-110" : "bg-(--c-surf2) hover:scale-105")} onClick={() => setEmoji(e)} aria-label="аватар">
              {e}
            </button>
          ))}
        </div>
        <Btn
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            snd.ok();
            await send({ type: "join", name: name.trim(), color, emoji });
            setBusy(false);
          }}
        >
          {busy ? "Садимся…" : "За стол"}
        </Btn>
        {conn === "polling" && <p className="text-[11px] text-(--c-mut) mt-3 text-center">Соединение нестабильное — используем резервный канал</p>}
      </div>
      <Link href="/" className="mt-4 text-sm text-(--c-mut) hover:text-(--c-ink)">На главную</Link>
    </Center>
  );
}

// ---------- ЛОББИ ----------
function Lobby({ room, me, isHost, send }: any) {
  const host = room.players.find((p: any) => p.id === room.hostId);
  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg">За столом · {room.players.length}/8</h3>
          {isHost && room.players.length < 8 && (
            <Btn size="sm" variant="soft" onClick={() => { snd.click(); send({ type: "bot" }); }}>
              + Бот
            </Btn>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {room.players.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-(--c-surf2) border border-(--c-line) px-3 py-2">
              <Avatar name={p.name} color={p.color} emoji={p.emoji} size={36} ring={p.id === room.hostId} />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">
                  {p.name}
                  {p.id === me.id && <span className="text-(--c-mut) text-xs"> (ты)</span>}
                  {p.isBot && <span className="text-[10px] text-(--c-mut) border border-(--c-line) rounded px-1 ml-1.5">БОТ</span>}
                </div>
                {p.id === room.hostId && <div className="text-[10px] text-(--c-accent)">ведущий</div>}
              </div>
              {isHost && p.id !== me.id && !p.isBot && (
                <Btn size="sm" variant="ghost" title="Сделать ведущим" onClick={() => send({ type: "host", playerId: p.id })}>
                  корона
                </Btn>
              )}
              {isHost && p.isBot && (
                <Btn size="sm" variant="ghost" title="Убрать бота" onClick={() => send({ type: "bot-del", playerId: p.id })}>
                  ×
                </Btn>
              )}
            </div>
          ))}
          {!room.players.length && <div className="text-sm text-(--c-mut) py-4 text-center">Пока никого — позови по ссылке из шапки</div>}
        </div>
        <p className="text-xs text-(--c-mut) mt-3">
          Если уйдёшь — права ведущего передадутся следующему человеку.
        </p>
      </Panel>

      <div className="flex flex-col gap-3">
        {isHost ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {GAME_ORDER.map((id, i) => {
                const m = GAME_META[id];
                const n = room.players.length;
                const ok = n >= m.min && n <= m.max;
                return (
                  <button
                    key={id}
                    disabled={!ok}
                    onClick={() => { snd.click(); send({ type: "select", gameId: id }); }}
                    className={"rounded-2xl border p-3 text-left transition-all " +
                      (ok ? "border-(--c-line) bg-(--c-surf) hover:border-(--c-accent) hover:-translate-y-0.5 cursor-pointer" : "border-(--c-line) bg-(--c-surf) opacity-45 cursor-default")}
                  >
                    <div className="flex items-center justify-between">
                      <GameIcon id={id} />
                      <span className="text-[10px] text-(--c-mut)">{i + 1}</span>
                    </div>
                    <div className="font-display text-sm mt-2 leading-tight">{m.title}</div>
                    <div className={"text-[10px] mt-1 " + (ok ? "text-(--c-mut)" : "text-[#ff8b90]")}>{m.min}–{m.max} игр.</div>
                  </button>
                );
              })}
            </div>
            {room.players.length >= 3 && (
              <Btn variant="primary" size="lg" className="w-full" onClick={() => { snd.win(); send({ type: "start", tournament: true }); }}>
                Начать турнир · 8 игр
              </Btn>
            )}
            {room.players.length < 3 && (
              <div className="text-xs text-[--c-mut] text-center -mt-1">Для полного турнира нужно минимум 3 игрока (можно добавить ботов)</div>
            )}
          </>
        ) : (
          <Panel className="text-center py-8">
            <div className="text-sm text-(--c-mut) mb-1">Ведущий — {host?.name ?? "…"}. Он выбирает игру.</div>
            <div className="text-xs text-(--c-mut) opacity-70">Добавляй ботов? Нет, только ведущий. Ждём выбор…</div>
          </Panel>
        )}
        <Panel className="!bg-transparent border-dashed">
          <div className="text-xs text-(--c-mut) leading-relaxed">
            <b className="text-(--c-ink)">8 игр одним вечером:</b> Бонжур, мадам! → Шляпа → Перудо → Лото → Пароль → Верю — не верю → Кубики → Чапаев. Одиночная игра или полный турнир с таблицей очков.
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- ПРАВИЛА ----------
function Rules({ gameId, isHost, onStart, onBack }: any) {
  const doc = RULES[gameId] ?? TOURNAMENT_RULES;
  return (
    <Panel className="max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-1">
        <GameIcon id={gameId} />
        <h2 className="font-display text-2xl">{doc.title}</h2>
      </div>
      <p className="text-sm text-(--c-mut) mb-4">{doc.intro}</p>
      <ul className="flex flex-col gap-2 mb-6">
        {doc.points.map((p, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className="text-(--c-accent) font-display text-xs mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 flex-wrap">
        {isHost && <Btn variant="primary" onClick={() => onStart(gameId)}>Начать игру</Btn>}
        {isHost && <Btn variant="ghost" onClick={() => onBack()}>Назад</Btn>}
        {!isHost && <span className="text-sm text-(--c-mut) self-center">Ведущий прочитает вслух и нажмёт «Начать»</span>}
      </div>
    </Panel>
  );
}

// ---------- РЕЗУЛЬТАТЫ ----------
function Results({ room, me, send }: any) {
  const g = room.game;
  const isHost = room.hostId === me.id;
  const t = room.tournament;
  useEffect(() => { snd.win(); }, []);
  if (!g) return null;
  const rank: string[] = g.rank ?? [];
  const standings = t
    ? [...room.players].sort((a: any, b: any) => (t.standings[b.id] ?? 0) - (t.standings[a.id] ?? 0))
    : null;
  const lastRound = t && t.round >= t.order.length;
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <Panel className="text-center">
        <div className="text-4xl mb-2" aria-hidden>🏆</div>
        <h2 className="font-display text-2xl">«{g.title}» окончена</h2>
        {t && <div className="text-sm text-(--c-mut) mt-1">Турнир: сыграно {t.round} из {t.order.length}</div>}
      </Panel>
      <Panel>
        <div className="text-xs text-(--c-mut) mb-2">Результаты игры</div>
        <div className="flex flex-col gap-1.5">
          {rank.map((pid: string, i: number) => {
            const p = room.players.find((x: any) => x.id === pid);
            if (!p) return null;
            const medal = i === 0 ? "bg-(--c-accent) text-[#241505]" : i === 1 ? "bg-[#c9c9c9] text-[#333]" : i === 2 ? "bg-[#c96f32] text-white" : "bg-(--c-surf2) text-(--c-mut)";
            return (
              <div key={pid} className="flex items-center gap-3 rounded-xl bg-(--c-surf2) border border-(--c-line) px-3 py-2">
                <span className={"w-7 h-7 rounded-full flex items-center justify-center font-display text-sm " + medal}>{i + 1}</span>
                <Avatar name={p.name} color={p.color} emoji={p.emoji} size={30} />
                <span className="flex-1 text-sm truncate">{p.name}</span>
                {g.points?.[pid] != null && <span className="text-xs text-(--c-accent) font-bold">+{g.points[pid]}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
      {standings && (
        <Panel>
          <div className="text-xs text-(--c-mut) mb-2">Турнирная таблица</div>
          <div className="flex flex-col gap-1.5">
            {standings.map((p: any, i: number) => (
              <div key={p.id} className={"flex items-center gap-3 rounded-xl px-3 py-2 text-sm " + (i === 0 ? "bg-(--c-accent14) border border-(--c-accent44)" : "bg-(--c-surf2)")}>
                <span className="font-display text-(--c-mut) text-xs w-4">{i + 1}</span>
                <Avatar name={p.name} color={p.color} emoji={p.emoji} size={26} />
                <span className="flex-1 truncate">{p.name}</span>
                <b className="text-(--c-accent)">{t.standings[p.id] ?? 0}</b>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {isHost ? (
          t?.active ? (
            <Btn variant="primary" size="lg" onClick={() => send({ type: "next" })}>
              {lastRound ? "К итогам турнира" : "Следующая игра"}
            </Btn>
          ) : (
            <>
              <Btn variant="primary" onClick={() => send({ type: "restart" })}>Перезапустить</Btn>
              <Btn variant="soft" onClick={() => send({ type: "lobby" })}>В лобби</Btn>
            </>
          )
        ) : (
          <span className="text-sm text-(--c-mut)">Ждём ведущего…</span>
        )}
      </div>
    </div>
  );
}

// ---------- ФИНАЛ ----------
function Final({ room, me, send }: any) {
  const isHost = room.hostId === me.id;
  const t = room.tournament;
  const standings = [...room.players].sort((a: any, b: any) => (t?.standings[b.id] ?? 0) - (t?.standings[a.id] ?? 0));
  useEffect(() => { snd.win(); }, []);
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <Panel className="text-center bg-[radial-gradient(circle_at_50%_0%,rgba(245,165,36,.18),transparent_60%)]">
        <div className="text-5xl mb-2" aria-hidden>👑</div>
        <h2 className="font-display text-3xl mb-1">Чемпион вечера</h2>
        <div className="font-display text-2xl text-(--c-accent)">
          {standings[0] ? `${standings[0].emoji} ${standings[0].name}` : "—"}
        </div>
        <div className="text-sm text-(--c-mut) mt-2">Все 8 игр сыграны. Спасибо, что прошли вечер вместе!</div>
      </Panel>
      <Panel>
        <div className="text-xs text-(--c-mut) mb-2">Итоговая таблица</div>
        <div className="flex flex-col gap-1.5">
          {standings.map((p: any, i: number) => (
            <div key={p.id} className={"flex items-center gap-3 rounded-xl px-3 py-2 text-sm " + (i === 0 ? "bg-(--c-accent14) border border-(--c-accent44)" : "bg-(--c-surf2)")}>
              <span className="font-display w-5" style={{ color: i < 3 ? "#f5a524" : undefined }}>{i + 1}</span>
              <Avatar name={p.name} color={p.color} emoji={p.emoji} size={30} />
              <span className="flex-1 truncate">{p.name}</span>
              <b className="text-(--c-accent)">{t?.standings[p.id] ?? 0} очков</b>
            </div>
          ))}
        </div>
        {t?.results?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-(--c-line)">
            <div className="text-xs text-(--c-mut) mb-1.5">История турнира</div>
            {t.results.map((r: any, i: number) => (
              <div key={i} className="text-xs text-(--c-mut) flex justify-between py-0.5">
                <span>{i + 1}. {r.title}</span>
                <span>{room.players.find((p: any) => p.id === r.winners?.[0])?.name}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
      {isHost && (
        <div className="flex gap-2 justify-center flex-wrap">
          {room.players.length >= 3 && (
            <Btn variant="primary" size="lg" onClick={() => { snd.win(); send({ type: "start", tournament: true }); }}>
              Ещё один турнир
            </Btn>
          )}
          <Btn variant="soft" size="lg" onClick={() => send({ type: "lobby" })}>В лобби</Btn>
        </div>
      )}
    </div>
  );
}

// ---------- ЧАТ ----------
function Chat({ room, me, send, onDone }: any) {
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    boxRef.current?.scrollTo({ top: 1e9 });
  }, [room.chat.length]);
  return (
    <Panel className="flex-1 min-h-0 flex flex-col !p-3 h-full">
      <div className="text-xs text-(--c-mut) mb-2 flex items-center justify-between">
        <span>Чат комнаты</span>
        {onDone && (
          <button onClick={onDone} className="text-(--c-mut) hover:text-(--c-ink)">закрыть ×</button>
        )}
      </div>
      <div ref={boxRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 min-h-0">
        {room.chat.map((m: any) => {
          const p = room.players.find((x: any) => x.id === m.author);
          return m.system ? (
            <div key={m.id} className="text-[11px] text-center text-(--c-accent) bg-(--c-accent0d) rounded-lg px-2 py-1">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={"text-sm flex gap-2 " + (m.author === me.id ? "justify-end" : "")}>
              {p && m.author !== me.id && <span className="shrink-0"><Avatar name={p.name} color={p.color} emoji={p.emoji} size={20} /></span>}
              <div className={"rounded-xl px-2.5 py-1.5 max-w-[85%] break-words " + (m.author === me.id ? "bg-(--c-accent22)" : "bg-(--c-surf2)")}>
                {m.author !== me.id && <span className="text-[10px] text-(--c-mut) block">{p?.name}</span>}
                {m.text}
              </div>
            </div>
          );
        })}
        {!room.chat.length && <div className="text-xs text-(--c-mut) text-center mt-6">Спокойно, как в библиотеке… Напишите первым</div>}
      </div>
      <form
        className="flex gap-2 mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          snd.click();
          send({ type: "chat", text });
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          placeholder="Сообщение…"
          className="flex-1 bg-(--c-surf2) border border-(--c-line) rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-(--c-accent) min-w-0"
        />
        <Btn variant="primary" size="sm" type="submit">→</Btn>
      </form>
    </Panel>
  );
}
