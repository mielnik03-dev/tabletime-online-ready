"use client";
import { useRef, useState } from "react";
import { Panel, Avatar } from "../ui";
import { snd } from "../sound";

export default function Chapayev({ gs, you, me, room, send }: any) {
  const ref = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const inMatch = !!you?.inMatch;
  const myTurn = !!you?.myTurn && gs.phase === "aim";
  const sideOf = (pid: string) => (gs.match?.a === pid ? 0 : 1);
  const colorOf = (pid: string) => (sideOf(pid) === 0 ? "#f5a524" : "#4f9de5");

  const toBoard = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * gs.board,
      y: ((e.clientY - r.top) / r.height) * gs.board,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!myTurn) return;
    const pt = toBoard(e);
    if (!pt) return;
    // попал по своей шашке?
    const hit = gs.chips.find(
      (c: any) => !c.out && c.pid === me.id && Math.hypot(c.x - pt.x, c.y - pt.y) < gs.r * 1.6
    );
    if (hit) {
      setSel(hit.id);
      snd.click();
      return;
    }
    if (sel !== null) {
      snd.thud();
      send({ type: "game", a: { chip: sel, tx: pt.x, ty: pt.y } });
      setSel(null);
    }
  };

  const nameOf = (pid: string) => room.players.find((p: any) => p.id === pid)?.name ?? "?";

  return (
    <div className="flex flex-col gap-4">
      {gs.match ? (
        <Panel>
          <div className="flex items-center justify-center gap-4">
            {[gs.match.a, gs.match.b].map((pid: string, i: number) => {
              const p = room.players.find((x: any) => x.id === pid);
              return (
                <div key={pid} className={"flex items-center gap-2.5 rounded-xl border px-3 py-2 " + (gs.turn === pid && !gs.over ? "border-(--c-accent) bg-(--c-accent14)" : "border-(--c-line)")}>
                  <span className="w-3 h-3 rounded-full" style={{ background: colorOf(pid) }} />
                  {p && <Avatar name={p.name} color={p.color} emoji={p.emoji} size={26} />}
                  <span className="text-sm max-w-[90px] truncate">{nameOf(pid)}</span>
                  <span className="font-display text-xl" style={{ color: colorOf(pid) }}>{gs.matchWins[pid] ?? 0}</span>
                  {i === 0 && <span className="font-display text-(--c-mut) text-lg mx-1">:</span>}
                </div>
              );
            })}
          </div>
          <div className="text-center text-[11px] text-(--c-mut) mt-2">
            Матч до 3 побед в раундах{gs.bracket.length > 1 ? ` · сетка: раунд ${gs.roundIdx + 1}/${gs.totalRounds}` : ""}
          </div>
        </Panel>
      ) : (
        <div className="text-center text-(--c-mut) text-sm py-4">Собираем пару для матча…</div>
      )}

      <div className="relative">
        <svg
          ref={ref}
          viewBox="0 0 8 8"
          onPointerDown={onDown}
          className="w-full max-w-[520px] mx-auto rounded-2xl touch-none select-none"
          style={{
            background: "radial-gradient(circle at 50% 40%, #35755233, transparent 70%), #223c2f",
            border: "4px solid #1a2c22",
            cursor: myTurn ? "crosshair" : "default",
            aspectRatio: "1",
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <g key={i} stroke="#ffffff14" strokeWidth="0.03">
              <line x1={i + 1} y1={0} x2={i + 1} y2={8} />
              <line x1={0} y1={i + 1} x2={8} y2={i + 1} />
            </g>
          ))}
          <line x1={4} y1={0} x2={4} y2={8} stroke="#ffffff22" strokeWidth="0.06" strokeDasharray="0.2 0.2" />
          {gs.chips.map((c: any) => (
            <g key={c.id} style={{ transition: c.out ? "opacity .4s" : "transform .2s linear", transform: `translate(${c.x}px, ${c.y}px)`, opacity: c.out ? 0 : 1 }}>
              <circle r={gs.r} fill={colorOf(c.pid)} stroke={sel === c.id ? "#fff" : "#00000055"} strokeWidth={sel === c.id ? 0.12 : 0.05} />
              <circle r={gs.r * 0.45} fill="#00000022" />
            </g>
          ))}
        </svg>
        {myTurn && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/60 text-(--c-ink) px-3 py-1.5 rounded-full whitespace-nowrap">
            {sel === null ? "Коснись своей шашки" : "Коснись точки удара (дальше = сильнее)"}
          </div>
        )}
      </div>

      {!inMatch && !gs.over && (
        <div className="text-center text-sm text-(--c-mut)">Зрительский режим: за этой парой — ты включишься в сетке позже</div>
      )}
      {gs.over && gs.champion && (
        <div className="text-center font-display text-xl text-(--c-accent)">Чемпион Чапаева — {nameOf(gs.champion)}</div>
      )}

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
