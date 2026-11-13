"use client";
import { Btn, Panel, useNow } from "../ui";
import { snd } from "../sound";

export default function Loto({ gs, you, me, room, send }: any) {
  const now = useNow(250);
  void now;
  const card: number[][] = you?.myCard ?? [];
  const marks: number[] = you?.myMarks ?? [];
  const manual = (you?.myMode ?? "manual") === "manual";
  const drawnSet = new Set(gs.drawn as number[]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-(--c-felt) border-2 border-(--c-accent) flex items-center justify-center font-display text-3xl text-(--c-ink) shrink-0 animate-[pop_.25s_ease-out]" key={gs.last ?? 0}>
          {gs.last ?? "—"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-(--c-mut) mb-1">
            Вытащено {gs.drawn.length} из 90 · {manual ? "ручной режим" : "авто-режим"}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {gs.drawn.slice(-14).map((n: number, i: number) => (
              <span key={i} className={"w-7 h-7 rounded-full text-xs flex items-center justify-center border " +
                (i === gs.drawn.slice(-14).length - 1 ? "bg-(--c-accent) text-[#241505] font-bold border-transparent" : "bg-(--c-surf2) border-(--c-line) text-(--c-mut)")}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Panel>
        <div className="text-xs text-(--c-mut) mb-2">Твоя карточка (линий: {you?.myLines ?? 0})</div>
        <div className="grid grid-rows-3 gap-1">
          {card.map((row: number[], r: number) => (
            <div key={r} className="grid grid-cols-9 gap-1">
              {row.map((n: number, c: number) => {
                const marked = marks.includes(n);
                const drawn = drawnSet.has(n);
                return (
                  <button
                    key={c}
                    disabled={!manual || marked}
                    onClick={() => { snd.click(); send({ type: "game", a: { type: "mark", n } }); }}
                    className={"h-10 sm:h-11 rounded-lg text-xs sm:text-sm font-semibold border transition-all " +
                      (marked
                        ? "bg-(--c-felt) border-[#2f6b4f] text-[#dff5e7] scale-95"
                        : drawn
                          ? "bg-(--c-accent14) border-(--c-accent88) text-(--c-ink) cursor-pointer hover:scale-105"
                          : "bg-(--c-surf2) border-(--c-line) text-(--c-mut)")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2 items-center">
        <Btn
          variant={manual ? "soft" : "primary"}
          size="sm"
          onClick={() => send({ type: "game", a: { type: "mode", mode: manual ? "auto" : "manual" } })}
        >
          {manual ? "Включить авто" : "Включить ручной"}
        </Btn>
        <Btn variant="soft" onClick={() => { snd.ding(); send({ type: "game", a: { type: "claim", kind: "line" } }); }}>
          Линия
        </Btn>
        <Btn variant="primary" onClick={() => { snd.win(); send({ type: "game", a: { type: "claim", kind: "full" } }); }}>
          Полное лото
        </Btn>
        <span className="text-xs text-(--c-mut)">Ложная заявка — пропуск следующего числа</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {gs.pids.map((pid: string) => {
          const p = room.players.find((x: any) => x.id === pid);
          return p ? (
            <div key={pid} className={"rounded-xl border px-3 py-2 text-sm " + (gs.full === pid ? "border-(--c-accent) bg-(--c-accent14)" : "border-(--c-line) bg-(--c-surf)")}>
              <div className="truncate">{p.emoji} {p.name}</div>
              <div className="text-xs text-(--c-mut)">
                линии: {gs.lines[pid] ?? 0}{gs.full === pid ? " · ПОЛНОЕ" : ""}
              </div>
            </div>
          ) : null;
        })}
      </div>

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
