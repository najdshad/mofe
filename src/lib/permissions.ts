import { prisma } from "./prisma";
import { ApiError } from "./api-helpers";

export async function getVenueMembership(userId: string, venueId: string) {
  return prisma.venueMember.findUnique({
    where: { venueId_userId: { venueId, userId } },
  });
}

export async function requireVenueAccess(userId: string, venueId: string) {
  const membership = await getVenueMembership(userId, venueId);
  if (!membership) {
    throw new ApiError("Unauthorized: no access to this venue", 401);
  }
  return membership;
}

export async function getAccessibleVenues(userId: string) {
  return prisma.venueMember.findMany({
    where: { userId },
    include: { venue: true },
  });
}
