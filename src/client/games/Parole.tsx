"use client";
import { useState } from "react";
import { Btn, Panel, Avatar } from "../ui";
import { snd } from "../sound";

export default function Parole({ gs, you, me, room, send }: any) {
  const [text, setText] = useState("");
  const hintTeam = gs.hintFor;
  const wordTeam = gs.wordFor;
  const teamName = (i: number) => `Команда ${i + 1}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {gs.teams.map((team: string[], i: number) => (
          <Panel key={i} className={i === wordTeam ? "border-(--c-accent44)" : ""}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm">{teamName(i)}</span>
              <span className="font-display text-2xl text-(--c-accent)">{gs.score[i]}</span>
            </div>
            <div className="text-[11px] text-(--c-mut) mb-2">
              {i === wordTeam ? "держит секретное слово" : "даёт подсказки"} · до {gs.target} очков
            </div>
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

      <Panel>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="text-xs text-(--c-mut)">
            Подсказки: {gs.hints.length} / 4 · раунд {gs.round}
          </div>
          <div className="flex gap-1.5">
            {gs.hints.map((h: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-(--c-surf2) border border-(--c-line) text-xs">
                {h}
              </span>
            ))}
          </div>
        </div>
        {you?.isHinting && (
          <form
            className="flex gap-2 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              snd.click();
              send({ type: "game", a: { type: "hint", text: text.trim() } });
              setText("");
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Одно слово-подсказка"
              className="flex-1 bg-(--c-surf2) border border-(--c-line) rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-(--c-accent)"
            />
            <Btn variant="primary" type="submit">Подсказка</Btn>
          </form>
        )}
        {you?.myWord && (
          <>
            <div className="mt-3 text-xs text-(--c-mut)">Ваше секретное слово:</div>
            <div className="font-display text-2xl text-(--c-accent) mb-3">{you.myWord}</div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                snd.click();
                send({ type: "game", a: { type: "guess", text: text.trim() } });
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ваш ответ"
                className="flex-1 bg-(--c-surf2) border border-(--c-line) rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-(--c-accent)"
              />
              <Btn variant="primary" type="submit">Угадали</Btn>
            </form>
          </>
        )}
        {you && !you.isHinting && !you.myWord && (
          <div className="mt-3 text-sm text-(--c-mut)">Сейчас ходит {teamName(hintTeam)}</div>
        )}
      </Panel>

      <div className="rounded-xl bg-(--c-surf) border border-(--c-line) px-3 py-2 text-xs text-(--c-mut) max-h-24 overflow-y-auto">
        {gs.log?.map((l: string, i: number) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
