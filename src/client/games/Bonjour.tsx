"use client";
import { CardFace, useNow, TimerBar } from "../ui";
import { snd } from "../sound";

const BTNS = [
  { id: "dam", label: "Бонжур, мадам!", color: "#3f9d6e" },
  { id: "val", label: "Пардон, мсье!", color: "#f5a524" },
  { id: "cor", label: "Салют!", color: "#e5484d" },
  { id: "tuz", label: "Хлопок!", color: "#4f9de5" },
];

export default function Bonjour({ gs, you, me, room, send }: any) {
  const now = useNow(100);
  const special = !!gs.current?.special;
  const canPress = special && !you?.pressed && !gs.over;
  const players = [...room.players].sort((a: any, b: any) => (gs.penalties[a.id] ?? 0) - (gs.penalties[b.id] ?? 0));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-(--c-mut)">
          Карт в колоде: <b className="text-(--c-ink)">{gs.deckLeft}</b>
        </div>
        {special && <div className="flex-1 min-w-[140px]"><TimerBar deadline={gs.deadline} total={8000} now={now} /></div>}
      </div>

      <div className="flex items-center justify-center py-2 min-h-[190px]">
        {gs.current ? (
          <div className={"flex flex-col items-center gap-2 " + (special ? "animate-[pop_.2s_ease-out]" : "")}>
            <CardFace r={gs.current.r} s={gs.current.s} size={110} />
            {special && (
              <div className="font-display text-xl text-(--c-accent) animate-pulse">
                Специальная карта — жми свою кнопку!
              </div>
            )}
          </div>
        ) : (
          <div className="text-(--c-mut) text-sm py-16">Колода перемешивается…</div>
        )}
      </div>

      {you?.wrong && !gs.current && (
        <div className="text-center text-[#ff8b90] font-bold animate-[shake_.3s_ease]">Не та кнопка! Штраф +1</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {BTNS.map((b) => (
          <button
            key={b.id}
            disabled={!canPress}
            onClick={() => {
              if (b.id === gs.current?.btn) snd.ok();
              else snd.bad();
              send({ type: "game", a: { btn: b.id } });
            }}
            className={"rounded-2xl py-4 px-2 font-display text-sm sm:text-base transition-all active:scale-95 disabled:saturate-50 " +
              (special && !gs.over ? "hover:brightness-110 cursor-pointer" : "opacity-45 cursor-default")}
            style={{ background: b.color + "26", border: `2px solid ${b.color}`, color: b.color }}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-(--c-line) bg-(--c-surf) p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {players.map((p: any) => (
          <div key={p.id} className={"flex items-center justify-between rounded-xl px-3 py-2 text-sm " + (p.id === me.id ? "bg-(--c-accent14) border border-(--c-accent44)" : "bg-(--c-surf2)")}>
            <span className="truncate">{p.emoji} {p.name}</span>
            <b className={(gs.penalties[p.id] ?? 0) > 0 ? "text-[#ff8b90]" : "text-(--c-mut)"}>{gs.penalties[p.id] ?? 0}</b>
          </div>
        ))}
      </div>

      {gs.log?.length > 0 && <div className="text-xs text-(--c-mut)">{gs.log[0]}</div>}
    </div>
  );
}
