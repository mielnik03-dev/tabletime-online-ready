"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Btn, GameIcon, Panel } from "@/client/ui";
import { saveToken } from "@/client/useRoom";
import { snd } from "@/client/sound";

const GAMES = [
  { id: "bonjour", n: "1", title: "Бонжур, мадам!", d: "реакция" },
  { id: "shlyapa", n: "2", title: "Шляпа", d: "командные слова" },
  { id: "perudo", n: "3", title: "Перудо", d: "блеф с кубиками" },
  { id: "loto", n: "4", title: "Лото", d: "90 чисел" },
  { id: "parole", n: "5", title: "Пароль", d: "подсказки" },
  { id: "veryu", n: "6", title: "Верю — не верю", d: "карточный блеф" },
  { id: "kubiki", n: "7", title: "Кубики", d: "13 категорий" },
  { id: "chapayev", n: "8", title: "Чапаев", d: "физика 8×8" },
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    snd.win();
    try {
      const r = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      saveToken(d.code, d.token);
      router.push("/room/" + d.code);
    } finally {
      setBusy(false);
    }
  };
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 3) return;
    const token = "t" + Math.random().toString(36).slice(2, 14);
    saveToken(c, token);
    router.push("/room/" + c);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <div className="flex items-center gap-2 text-xs text-(--c-mut) border border-(--c-line) rounded-full px-4 py-1.5 mb-8 bg-(--c-surf)">
          <span className="w-1.5 h-1.5 rounded-full bg-(--c-felt) animate-pulse" />
          вечер в сборе · без регистрации · работает на телефоне
        </div>
        <h1 className="font-display text-4xl sm:text-6xl leading-tight text-center mb-4">
          Вечер за столом:
          <br />
          <span className="text-(--c-accent)">8 игр онлайн</span>
        </h1>
        <p className="text-center text-(--c-mut) max-w-xl mb-10">
          Создайте комнату, отправьте друзьям ссылку — и сыграйте все 8 настольных и словесных игр.
          Ведущий, боты, турнир и таблица очков уже ждут.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl mb-12">
          <Panel className="flex flex-col gap-3 border-(--c-accent44)" >
            <div>
              <div className="font-display text-lg mb-1">Создать комнату</div>
              <div className="text-xs text-(--c-mut) leading-relaxed">Мгновенно. Получите код и ссылку, чтобы звать друзей.</div>
            </div>
            <Btn variant="primary" size="lg" onClick={create} disabled={busy} className="mt-auto w-full">
              {busy ? "Расставляем стулья…" : "Создать комнату"}
            </Btn>
          </Panel>
          <Panel className="flex flex-col gap-3">
            <div>
              <div className="font-display text-lg mb-1">У меня есть код</div>
              <div className="text-xs text-(--c-mut) mb-3">Друг создал комнату и прислал ссылку или 4-значный код.</div>
            </div>
            <form onSubmit={join} className="mt-auto flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="АБВГ"
                className="flex-1 min-w-0 bg-(--c-surf2) border border-(--c-line) rounded-2xl px-4 py-3 font-display tracking-[0.3em] focus:outline-none focus:border-(--c-accent)"
              />
              <Btn variant="soft" size="lg" type="submit" disabled={code.trim().length < 3}>Войти</Btn>
            </form>
          </Panel>
        </div>

        <div className="w-full mb-10">
          <h2 className="font-display text-sm text-(--c-mut) mb-3 text-center tracking-widest uppercase">Все 8 игр вечера</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {GAMES.map((g) => (
              <div key={g.id} className="rounded-2xl border border-(--c-line) bg-(--c-surf) p-3 flex items-center gap-2.5">
                <GameIcon id={g.id} />
                <div className="min-w-0">
                  <div className="text-xs font-display truncate">{g.title}</div>
                  <div className="text-[10px] text-(--c-mut)">{g.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 w-full">
          {[
            ["01", "Создайте комнату", "Код и ссылка-приглашение появляются сразу."],
            ["02", "Выберите игру", "Одна игра на пробу или полный турнир из 8."],
            ["03", "Делите стол", "Чат, боты для пустых стульев и турнирная таблица."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-(--c-line) bg-(--c-surf) p-4">
              <div className="font-display text-(--c-accent) text-sm mb-1">{n}</div>
              <div className="text-sm font-display mb-1">{t}</div>
              <div className="text-xs text-(--c-mut) leading-relaxed">{d}</div>
            </div>
          ))}
        </div>

        <footer className="mt-12 text-center text-[11px] text-(--c-mut)">
          Все правила — на экране перед каждой игрой · Звук включается после первого касания
        </footer>
      </div>
    </div>
  );
}
