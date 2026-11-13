import { applyAction, buildView, getRoom } from "@/server/rooms";

export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
function rateLimit(token: string): boolean {
  const now = Date.now();
  const arr = (hits.get(token) ?? []).filter((t) => now - t < 2000);
  if (arr.length >= 40) return false;
  arr.push(now);
  hits.set(token, arr);
  return true;
}

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { code } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const room = getRoom(code);
  if (!room) return Response.json({ gone: true, me: null, room: null }, { status: 404 });
  return Response.json(buildView(room, token));
}

export async function POST(req: Request, { params }: Ctx) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "");
  if (!token || !rateLimit(token)) return Response.json({ error: "Слишком часто, подожди" }, { status: 429 });
  const room = getRoom(code);
  if (!room) return Response.json({ gone: true }, { status: 404 });
  try {
    const res = applyAction(room, token, body);
    return Response.json({ ok: true, ...res, me: res.me ? res.me : null });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Ошибка" }, { status: 400 });
  }
}
