"use client";
import { useState } from "react";
import { Btn, DiceFace, Panel, Avatar, useNow } from "../ui";
import { snd } from "../sound";

const VALNAMES = ["", "единицы", "двойки", "тройки", "четвёрки", "пятёрки", "шестёрки"];

export default function Perudo({ gs, you, me, room, send }: any) {
  const now = useNow(300);
  void now;
  const [value, setValue] = useState(1);
  const [count, setCount] = useState(2);
  const myTurn = !!you?.myTurn;
  const minCount = gs.bid ? Math.max(2, gs.bid.count) : 2;
  const invalid =
    count < minCount ||
    (gs.bid && count === gs.bid.count && value <= gs.bid.value) ||
    (gs.bid && count > gs.bid.count && count <= gs.bid.count);
  const by = gs.bid ? room.players.find((p: any) => p.id === gs.bid.by)?.name : null;
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="text-xs text-(--c-mut) mb-2">Твои кубики (видны только тебе)</div>
        <div className="flex gap-2 flex-wrap">
          {(you?.myDice ?? []).map((d: number, i: number) => (
            <DiceFace key={i} v={d} size={44} />
          ))}
          {!(you?.myDice ?? []).length && <div className="text-sm text-[#ff8b90]">Кости закончились — ты выбыл</div>}
        </div>
      </Panel>

      <Panel className="text-center">
        <div className="text-xs text-(--c-mut) mb-1">Текущая ставка</div>
        {gs.bid ? (
          <div className="font-display text-2xl">
            <span className="text-(--c-accent)">{gs.bid.count}</span> {VALNAMES[gs.bid.value]}
            <span className="text-sm text-(--c-mut) font-body font-normal"> — {by}</span>
          </div>
        ) : (
          <div className="text-lg text-(--c-mut)">Ставок ещё нет</div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-2">
        {gs.order.map((pid: string) => {
          const p = room.players.find((x: any) => x.id === pid);
          if (!p) return null;
          const out = !gs.alive.includes(pid);
          return (
            <div
              key={pid}
              className={"flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm " +
                (gs.cur === pid ? "border-(--c-accent) bg-(--c-accent14)" : "border-(--c-line) bg-(--c-surf)") + (out ? " opacity-40 line-through" : "")}
            >
              <Avatar name={p.name} color={p.color} emoji={p.emoji} size={22} />
              {p.name}
              <span className="font-display text-(--c-accent)">{gs.diceCount[pid] ?? 0}</span>
            </div>
          );
        })}
      </div>

      {myTurn && !gs.over && (
        <Panel className="border-(--c-accent44)">
          <div className="text-xs text-(--c-mut) mb-2">Твой ход: сделай ставку или сомневайся</div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm text-(--c-mut)">Значение:</span>
            {[1, 2, 3, 4, 5, 6].map((v) => (
              <button
                key={v}
                onClick={() => { setValue(v); snd.click(); }}
                className={"w-10 h-10 rounded-xl border font-display text-sm transition-all " +
                  (value === v ? "bg-(--c-accent) text-[#241505] border-transparent font-bold" : "bg-(--c-surf2) border-(--c-line)")}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm text-(--c-mut)">Штук (мин. {minCount}):</span>
            <button className="w-10 h-10 rounded-xl bg-(--c-surf2) border border-(--c-line) font-bold" onClick={() => setCount((c) => Math.max(1, c - 1))}>−</button>
            <span className="w-10 text-center font-display">{count}</span>
            <button className="w-10 h-10 rounded-xl bg-(--c-surf2) border border-(--c-line) font-bold" onClick={() => setCount((c) => Math.min(25, c + 1))}>+</button>
          </div>
          <div className="flex gap-2">
            <Btn variant="primary" disabled={!!invalid} onClick={() => { snd.ok(); send({ type: "game", a: { type: "bid", count, value } }); }}>
              {count} {VALNAMES[value]}
            </Btn>
            <Btn variant="danger" onClick={() => { snd.bad(); send({ type: "game", a: { type: "doubt" } }); }}>
              Не верю
            </Btn>
          </div>
          {invalid && <div className="text-xs text-(--c-mut) mt-2">Ставка должна быть выше текущей</div>}
        </Panel>
      )}
      {!myTurn && !gs.over && (
        <div className="text-sm text-(--c-mut) text-center">Ходит: <b>{room.players.find((p: any) => p.id === gs.cur)?.name}</b></div>
      )}

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-28 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
