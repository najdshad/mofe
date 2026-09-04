import { prisma } from "./prisma";
import { ApiError } from "./api-helpers";
import { requireActiveSubscription } from "./subscription";

export async function requireVenueAccess(userId: string, venueId: string) {
  await requireActiveSubscription(userId);
  const venue = await prisma.venue.findFirst({
    where: { id: venueId, ownerId: userId },
    select: { id: true },
  });
  if (!venue) {
    throw new ApiError("Unauthorized: no access to this venue", 401);
  }
  return venue;
}

export async function getAccessibleVenues(userId: string) {
  return prisma.venue.findMany({ where: { ownerId: userId } });
}
