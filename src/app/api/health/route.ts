import { allRooms } from "@/server/rooms";

export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = allRooms();
  return Response.json({
    ok: true,
    rooms: rooms.length,
    activeGames: rooms.filter((r) => r.game && !r.game.finished).length,
    ts: Date.now(),
  });
}
