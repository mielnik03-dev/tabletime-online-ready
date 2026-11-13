"use client";
import { useState } from "react";
import { Btn, useNow, TimerBar, Panel, Avatar } from "../ui";
import { snd } from "../sound";

export default function Shlyapa({ gs, you, me, room, send }: any) {
  const now = useNow(150);
  const [guess, setGuess] = useState("");
  const presenting = you?.isPresenting;
  const teamName = (i: number) => `Команда ${i + 1}`;
  const seconds = Math.max(0, Math.ceil((gs.deadline - now) / 1000));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["Слова", "Жесты", "Одно слово"].map((m, i) => (
          <span
            key={m}
            className={"px-3 py-1.5 rounded-full text-xs border " + (gs.round === i ? "bg-(--c-accent) text-[#241505] font-bold border-transparent" : "border-(--c-line) text-(--c-mut)")}
          >
            {i + 1}. {m}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="font-display text-2xl tabular-nums w-14 text-center" style={{ color: seconds <= 10 ? "#e5484d" : "#f3e9d7" }}>
          {seconds}
        </div>
        <div className="flex-1"><TimerBar deadline={gs.deadline} total={60000} now={now} /></div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {gs.teams.map((team: string[], i: number) => (
          <Panel key={i} className={gs.turn === i && !gs.over ? "border-(--c-accent66) shadow-[0_0_24px_rgba(245,165,36,.12)]" : ""}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm">{teamName(i)}</span>
              <span className="font-display text-2xl text-(--c-accent)">{gs.scores[i]}</span>
            </div>
            {gs.turn === i && !gs.over && <div className="text-[11px] text-(--c-accent) mb-2">Объясняет — {gs.mode}</div>}
            <div className="flex flex-wrap gap-1.5">
              {team.map((pid: string) => {
                const p = room.players.find((x: any) => x.id === pid);
                return p ? (
                  <span key={pid} className="inline-flex items-center gap-1 text-xs bg-(--c-surf2) rounded-full pl-0.5 pr-2 py-0.5 border border-(--c-line)">
                    <Avatar name={p.name} color={p.color} emoji={p.emoji} size={20} />
                    {p.name}
                  </span>
                ) : null;
              })}
            </div>
          </Panel>
        ))}
      </div>

      {presenting && (
        <Panel className="border-(--c-accent44)">
          <div className="text-xs text-(--c-mut) mb-1">Секретное слово (видит только твоя команда):</div>
          <div className="font-display text-3xl text-(--c-accent) mb-3">{you?.word}</div>
          {gs.round === 1 && <div className="text-xs text-[#ff8b90] mb-3">Раунд жестов: не пишите слова в чат — он не читается.</div>}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!guess.trim()) return;
              snd.click();
              send({ type: "game", a: { text: guess.trim() } });
              setGuess("");
            }}
          >
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Угадали? Напишите слово"
              className="flex-1 bg-(--c-surf2) border border-(--c-line) rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-(--c-accent)"
            />
            <Btn variant="primary" type="submit">Угадали</Btn>
          </form>
        </Panel>
      )}
      {!presenting && !gs.over && (
        <div className="text-sm text-(--c-mut) text-center">Сейчас объясняет {teamName(gs.turn)} — следи за жестами…</div>
      )}

      {gs.log?.length > 0 && (
        <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
          {gs.log.map((l: string, i: number) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
