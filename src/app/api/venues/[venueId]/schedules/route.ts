import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { VALID_STATIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const schedules = await prisma.stationSchedule.findMany({
      where: { venueId },
      orderBy: [{ station: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json(schedules);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const body = await request.json();
    if (!Array.isArray(body.schedules)) {
      return NextResponse.json({ error: "schedules array is required" }, { status: 400 });
    }

    for (const s of body.schedules) {
      if (!VALID_STATIONS.includes(s.station as typeof VALID_STATIONS[number])) {
        return NextResponse.json(
          { error: `Invalid station: ${s.station}` },
          { status: 400 }
        );
      }
      if (s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        return NextResponse.json(
          { error: "dayOfWeek must be 0-6" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction([
      prisma.stationSchedule.deleteMany({ where: { venueId } }),
      ...body.schedules.map((s: { station: string; dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }) =>
        prisma.stationSchedule.create({
          data: {
            venueId,
            station: s.station,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: s.isActive ?? true,
          },
        })
      ),
    ]);

    const schedules = await prisma.stationSchedule.findMany({
      where: { venueId },
      orderBy: [{ station: "asc" }, { dayOfWeek: "asc" }],
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "schedules.update",
      entityType: "venue",
      entityId: venueId,
      metadata: { count: schedules.length },
    });

    return NextResponse.json(schedules);
  } catch (e) {
    return errorResponse(e);
  }
}
