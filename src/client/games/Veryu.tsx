"use client";
import { useState } from "react";
import { Btn, CardFace, CardBack, Panel, Avatar } from "../ui";
import { snd } from "../sound";

export default function Veryu({ gs, you, me, room, send }: any) {
  const [sel, setSel] = useState<number[]>([]);
  const hand: any[] = you?.myHand ?? [];
  const myTurn = !!you?.myTurn;
  const canDoubt = !!you?.canDoubt;
  const toggle = (id: number) => {
    snd.click();
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Panel className="!p-3">
          <div className="text-[11px] text-(--c-mut)">Текущий ранг</div>
          <div className="font-display text-xl text-(--c-accent)">{gs.rankName}</div>
        </Panel>
        <Panel className="!p-3">
          <div className="text-[11px] text-(--c-mut)">Стопка на столе</div>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: Math.min(gs.pileCount, 6) }).map((_, i) => (
              <CardBack key={i} size={30} angle={(i - 2) * 3} />
            ))}
            {gs.pileCount > 6 && <span className="text-xs text-(--c-mut) self-end">+{gs.pileCount - 6}</span>}
            {!gs.pileCount && <span className="text-xs text-(--c-mut)">пусто</span>}
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-2">
        {gs.pids.map((pid: string) => {
          const p = room.players.find((x: any) => x.id === pid);
          return p ? (
            <div key={pid} className={"flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm " + (gs.cur === pid ? "border-(--c-accent) bg-(--c-accent14)" : "border-(--c-line) bg-(--c-surf)")}>
              <Avatar name={p.name} color={p.color} emoji={p.emoji} size={22} />
              {p.name}
              <span className="font-display text-(--c-accent)">{gs.handCount[pid] ?? 0}</span>
            </div>
          ) : null;
        })}
      </div>

      {myTurn && (
        <Panel className="border-(--c-accent44)">
          <div className="text-xs text-(--c-mut) mb-2">
            Твой ход: выбери 1–4 карты и положи рубашкой (заявка — «{gs.rankName}»)
          </div>
          <div className="flex gap-2 flex-wrap mb-3 min-h-[60px]">
            {hand.map((c) => (
              <div key={c.id} onClick={() => toggle(c.id)} className="cursor-pointer">
                <CardFace r={c.r} s={c.s} size={44} selected={sel.includes(c.id)} />
              </div>
            ))}
            {!hand.length && <span className="text-sm text-(--c-mut)">Рука пуста</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" disabled={!sel.length} onClick={() => { snd.ok(); send({ type: "game", a: { type: "play", cards: sel } }); setSel([]); }}>
              Положить {sel.length || ""} (рубашкой)
            </Btn>
            {canDoubt && (
              <Btn variant="danger" onClick={() => { snd.bad(); send({ type: "game", a: { type: "doubt" } }); }}>
                Не верю
              </Btn>
            )}
          </div>
        </Panel>
      )}
      {canDoubt && !myTurn && null}
      {!myTurn && !gs.over && (
        <div className="text-sm text-(--c-mut) text-center">
          Ходит: <b>{room.players.find((p: any) => p.id === gs.cur)?.name}</b>
          {gs.pileCount > 0 ? " (может и оспорить)" : ""}
        </div>
      )}

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
