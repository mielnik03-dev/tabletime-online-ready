import { attachClient, getRoom } from "@/server/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { code } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const room = getRoom(code);

  const enc = new TextEncoder();
  let attached: { detach: () => void } | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const push = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          closed = true;
        }
      };
      if (room && token) {
        attached = attachClient(room, token, push);
        const hb = setInterval(() => push(": hb\n\n"), 15000);
        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(hb);
          attached?.detach();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      } else {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
