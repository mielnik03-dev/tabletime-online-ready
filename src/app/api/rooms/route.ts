import { createRoom } from "@/server/rooms";
import { uid } from "@/server/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const room = createRoom();
  return Response.json({ code: room.code, token: uid("t") + uid() });
}
