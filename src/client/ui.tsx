"use client";
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from "react";

export function useNow(interval = 200): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setN(Date.now()), interval);
    return () => clearInterval(iv);
  }, [interval]);
  return n;
}

export function TimerBar({ deadline, total, now }: { deadline: number; total: number; now: number }) {
  const left = Math.max(0, deadline - now);
  const pct = Math.min(100, (left / total) * 100);
  const danger = left < total * 0.25;
  return (
    <div className="w-full h-2.5 rounded-full bg-(--c-surf2) overflow-hidden border border-(--c-line)">
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: pct + "%", background: danger ? "#e5484d" : "#f5a524" }}
      />
    </div>
  );
}

export const AVATAR_COLORS = [
  "#f5a524", "#e5484d", "#3f9d6e", "#4f9de5",
  "#9a6fe0", "#e579b0", "#3ec6b8", "#c96f32",
];
export const AVATAR_EMOJIS = ["🙂", "😎", "🦊", "🐻", "🐱", "🐼", "🦉", "🐸", "", "", "", "🤠"];

export function Avatar({ name, color, emoji, size = 40, ring }: { name: string; color: string; emoji: string; size?: number; ring?: boolean }) {
  return (
    <div
      className={"flex items-center justify-center rounded-full shrink-0 " + (ring ? "ring-2 ring-(--c-accent) ring-offset-2 ring-offset-(--c-bg)" : "")}
      style={{ width: size, height: size, background: color + "33", border: `2px solid ${color}`, fontSize: size * 0.5 }}
      title={name}
    >
      <span aria-hidden>{emoji}</span>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
};
export function Btn({ variant = "soft", size = "md", className = "", ...rest }: BtnProps) {
  const v = {
    primary: "bg-(--c-accent) text-[#241505] hover:brightness-110 font-bold",
    danger: "bg-[#e5484d22] text-[#ff8b90] border border-[#e5484d55] hover:bg-[#e5484d33]",
    ghost: "bg-transparent text-(--c-mut) hover:text-(--c-ink) border border-(--c-line)",
    soft: "bg-(--c-surf2) text-(--c-ink) border border-(--c-line) hover:border-(--c-accent66)",
  }[variant];
  const s = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3.5 text-base rounded-2xl",
  }[size];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none ${v} ${s} ${className}`}
    />
  );
}

export function CopyBtn({ text, label = "Скопировать", className = "" }: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Btn
      variant="ghost"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? "Готово" : label}
    </Btn>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[20, 20]],
  2: [[12, 12], [28, 28]],
  3: [[12, 12], [20, 20], [28, 28]],
  4: [[12, 12], [28, 12], [12, 28], [28, 28]],
  5: [[12, 12], [28, 12], [20, 20], [12, 28], [28, 28]],
  6: [[12, 10], [28, 10], [12, 20], [28, 20], [12, 30], [28, 30]],
};
export function DiceFace({ v, size = 48, held }: { v: number; size?: number; held?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={held ? "drop-shadow-[0_0_8px_rgba(245,165,36,0.8)]" : ""}>
      <rect x="1" y="1" width="38" height="38" rx="8" fill={held ? "#f5a524" : "#f3e9d7"} stroke={held ? "#b06e0a" : "#3a2c1c"} strokeWidth="2" />
      {PIPS[v]?.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={held ? "#241505" : "#2b1e10"} />
      ))}
    </svg>
  );
}

export const SUIT_CHAR = ["♠", "♥", "♦", "♣"];
const RANK_CHAR = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export function CardFace({ r, s, size = 52, selected }: { r: number; s: number; size?: number; selected?: boolean }) {
  const red = s === 1 || s === 2;
  return (
    <div
      className={"relative rounded-lg flex flex-col items-center justify-center select-none transition-transform " + (selected ? "-translate-y-2" : "")}
      style={{
        width: size,
        height: size * 1.4,
        background: selected ? "linear-gradient(160deg,#f5a524,#d98a12)" : "linear-gradient(160deg,#fdf6e8,#efe0c2)",
        border: selected ? "2px solid #b06e0a" : "1px solid #b99",
        boxShadow: selected ? "0 6px 14px rgba(245,165,36,.35)" : "0 2px 6px rgba(0,0,0,.35)",
      }}
    >
      <span className="font-bold leading-none" style={{ color: red ? "#c03434" : "#2b1e10", fontSize: size * 0.34 }}>
        {RANK_CHAR[r]}
      </span>
      <span style={{ color: red ? "#c03434" : "#2b1e10", fontSize: size * 0.3 }} aria-hidden>
        {SUIT_CHAR[s]}
      </span>
    </div>
  );
}

export function CardBack({ size = 48, angle = 0 }: { size?: number; angle?: number }) {
  return (
    <div
      className="rounded-lg"
      style={{
        width: size,
        height: size * 1.4,
        transform: `rotate(${angle}deg)`,
        background: "repeating-linear-gradient(45deg,#8c3b2e 0 6px,#a04434 6px 12px)",
        border: "2px solid #5e241a",
        boxShadow: "0 2px 5px rgba(0,0,0,.4)",
      }}
    />
  );
}

export function Modal({ children, onClose, title }: { children: ReactNode; onClose?: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-(--c-line) bg-(--c-surf) p-5 shadow-2xl animate-[pop_.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="font-display text-lg text-(--c-ink) mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"rounded-2xl border border-(--c-line) bg-(--c-surf) p-4 " + className}>{children}</div>;
}

export function ConnDot({ conn }: { conn: string }) {
  const c = conn === "live" ? "#3f9d6e" : conn === "polling" ? "#f5a524" : "#e5484d";
  const t = conn === "live" ? "Соединение стабильное" : conn === "polling" ? "Переподключаемся…" : "Нет связи";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-(--c-mut)" title={t}>
      <span className="w-2 h-2 rounded-full" style={{ background: c, animation: conn === "live" ? undefined : "pulse 1s infinite" }} />
    </span>
  );
}

const ICONS: Record<string, ReactNode> = {
  bonjour: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="13" height="17" rx="2" />
      <path d="M8 3h11a2 2 0 0 1 2 2v13" opacity=".6" />
      <path d="M10 13l2 2 4-4" />
    </svg>
  ),
  shlyapa: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 14c0-5 3-9 7-9s7 4 7 9" />
      <path d="M3 14h18l-1.5 3h-15z" />
    </svg>
  ),
  perudo: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
    </svg>
  ),
  loto: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9.7h18M3 14.3h18M9 5v14M15 5v14" opacity=".7" />
      <circle cx="6" cy="7.4" r="1.1" fill="currentColor" />
      <circle cx="18" cy="16.6" r="1.1" fill="currentColor" />
    </svg>
  ),
  parole: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12h5" opacity=".7" />
    </svg>
  ),
  veryu: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="7" width="12" height="15" rx="2" />
      <rect x="8" y="3" width="12" height="15" rx="2" transform="rotate(8 14 10)" />
      <path d="M14 10l1.5 1.5L19 8" />
    </svg>
  ),
  kubiki: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="9" width="12" height="12" rx="2.5" />
      <rect x="9" y="3" width="12" height="12" rx="2.5" opacity=".7" />
      <circle cx="8" cy="14" r="1.3" fill="currentColor" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" />
    </svg>
  ),
  chapayev: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18M12 3v18" opacity=".5" />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
      <circle cx="16" cy="16" r="2.2" />
    </svg>
  ),
};
export function GameIcon({ id, className = "" }: { id: string; className?: string }) {
  return <span className={"text-(--c-accent) " + className}>{ICONS[id] ?? null}</span>;
}
