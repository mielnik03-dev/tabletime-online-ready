"use client";
import { Btn, DiceFace, Panel } from "../ui";
import { snd } from "../sound";

export default function Kubiki({ gs, you, me, room, send }: any) {
  const myTurn = !!you?.myTurn;
  const dice: number[] | null = you?.myDice;
  const kept: boolean[] = you?.myKept ?? [];
  const rolls: number = you?.myRolls ?? 0;
  const avail: string[] = you?.myAvailable ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-(--c-mut)">
        <span>Раунд <b className="text-(--c-ink)">{Math.min(gs.round, 13)}/13</b></span>
        <span>
          Ходит: <b className="text-(--c-accent)">{room.players.find((p: any) => p.id === gs.cur)?.name}</b>
        </span>
      </div>

      {myTurn ? (
        <Panel className="border-(--c-accent44)">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-(--c-mut)">Твои кубики (тапни, чтобы держать)</div>
            <div className="text-xs text-(--c-mut)">Бросков: {rolls}/3</div>
          </div>
          <div className="flex gap-3 flex-wrap mb-3 min-h-[64px] items-center">
            {dice
              ? dice.map((d, i) => (
                  <div key={i} className="cursor-pointer" onClick={() => { snd.click(); send({ type: "game", a: { type: "keep", i } }); }}>
                    <DiceFace v={d} size={56} held={kept[i]} />
                  </div>
                ))
              : <span className="text-sm text-(--c-mut)">Нажми «Бросить», чтобы начать</span>}
          </div>
          {dice && (
            <div className="flex gap-2 mb-3">
              <Btn variant="primary" disabled={rolls >= 3} onClick={() => { snd.thud(); send({ type: "game", a: { type: "roll" } }); }}>
                Бросить
              </Btn>
              <Btn variant="soft" onClick={() => { snd.click(); send({ type: "game", a: { type: "score", cat: null } }); }}>
                Пропустить (0)
              </Btn>
            </div>
          )}
          <div className="text-xs text-(--c-mut) mb-2">Записать в категорию:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {gs.cats.map((c: any) => {
              const mine = gs.scores[me.id]?.[c.id];
              const free = avail.includes(c.id);
              return (
                <button
                  key={c.id}
                  disabled={!free}
                  onClick={() => { snd.ok(); send({ type: "game", a: { type: "score", cat: c.id } }); }}
                  className={"rounded-lg px-2 py-1.5 text-xs border text-left transition-all " +
                    (free
                      ? "bg-(--c-accent14) border-(--c-accent66) hover:border-(--c-accent) cursor-pointer"
                      : "bg-(--c-surf2) border-(--c-line) text-(--c-mut) opacity-70")}
                >
                  <div className="truncate">{c.label}</div>
                  {mine !== null && mine !== undefined && <b className="text-(--c-accent)">{mine}</b>}
                </button>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel className="text-center text-sm text-(--c-mut) py-8">
          Ждём ход соперника…
          <div className="flex justify-center gap-3 mt-3 opacity-50">
            {[1, 3, 5, 2, 4].map((d, i) => (
              <DiceFace key={i} v={d} size={40} />
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <div className="text-xs text-(--c-mut) mb-2">Счёт</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {gs.order.map((pid: string) => {
            const p = room.players.find((x: any) => x.id === pid);
            return p ? (
              <div key={pid} className={"rounded-xl border px-3 py-2 " + (gs.cur === pid ? "border-(--c-accent)" : "border-(--c-line)")}>
                <div className="text-sm truncate">{p.emoji} {p.name}</div>
                <div className="font-display text-lg text-(--c-accent)">{gs.totals[pid] ?? 0}</div>
              </div>
            ) : null;
          })}
        </div>
      </Panel>

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
