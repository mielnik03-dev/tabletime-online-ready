"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type FullView = {
  me: any;
  gone?: boolean;
  room: any;
};

export function useRoom(code: string | undefined) {
  const [view, setView] = useState<FullView | null>(null);
  const [conn, setConn] = useState<"connecting" | "live" | "polling" | "gone">("connecting");
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string>("");
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!code) return;
    const key = "tn_" + code.toUpperCase();
    if (!tokenRef.current) {
      let saved = "";
      try {
        saved = localStorage.getItem(key) ?? "";
      } catch {
        /* private mode */
      }
      tokenRef.current = saved || "t" + Math.random().toString(36).slice(2, 14);
      try {
        localStorage.setItem(key, tokenRef.current);
      } catch {
        /* ignore */
      }
    }
    const token = tokenRef.current;
    let stopped = false;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const apply = (data: any) => {
      if (!data) return;
      if (data.gone || data.room) {
        setView(data);
        if (data.gone) setConn("gone");
      }
    };
    const fetchView = async () => {
      try {
        const r = await fetch(`/api/rooms/${code}?token=${encodeURIComponent(token)}`);
        if (stopped) return;
        if (r.ok) {
          apply(await r.json());
          setConn("live");
        } else if (r.status === 404) {
          setView({ gone: true, me: null, room: null });
          setConn("gone");
          if (poll) { clearInterval(poll); poll = null; }
          retry = setTimeout(() => { if (!stopped && !es) fetchView(); }, 5000);
        } else {
          setConn("polling");
        }
      } catch {
        if (!stopped) setConn("polling");
      }
    };
    const connect = () => {
      if (stopped) return;
      es = new EventSource(`/api/rooms/${code}/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = (e) => {
        try {
          apply(JSON.parse(e.data));
        } catch {
          /* heartbeat */
        }
        setConn("live");
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (stopped) return;
        setConn("polling");
        if (!poll) poll = setInterval(fetchView, 1500);
        retry = setTimeout(() => {
          if (poll) { clearInterval(poll); poll = null; }
          connect();
        }, 6000);
      };
    };
    fetchView();
    connect();
    return () => {
      stopped = true;
      es?.close();
      if (poll) clearInterval(poll);
      if (retry) clearTimeout(retry);
    };
  }, [code]);

  const send = useCallback(
    async (a: any) => {
      if (!code) return { ok: false as const };
      setError(null);
      try {
        const r = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenRef.current, ...a }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(data.error ?? "Ошибка сервера");
          if (errTimer.current) clearTimeout(errTimer.current);
          errTimer.current = setTimeout(() => setError(null), 3500);
        }
        if (data.gone) setView({ gone: true, me: null, room: null });
        return data;
      } catch {
        setError("Сеть недоступна");
        return { ok: false as const };
      }
    },
    [code]
  );

  return { view, conn, error, send };
}

export function saveToken(code: string, token: string) {
  try {
    localStorage.setItem("tn_" + code.toUpperCase(), token);
  } catch {
    /* ignore */
  }
}
