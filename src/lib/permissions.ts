import { prisma } from "./prisma";

export type Role = "owner" | "manager" | "staff";

export async function getVenueMembership(userId: string, venueId: string) {
  return prisma.venueMember.findUnique({
    where: { venueId_userId: { venueId, userId } },
  });
}

export async function requireVenueAccess(userId: string, venueId: string) {
  const membership = await getVenueMembership(userId, venueId);
  if (!membership) {
    throw new Error("Unauthorized: no access to this venue");
  }
  return membership;
}

export async function requireRole(
  userId: string,
  venueId: string,
  allowedRoles: Role[]
) {
  const membership = await requireVenueAccess(userId, venueId);
  if (!allowedRoles.includes(membership.role as Role)) {
    throw new Error(
      `Forbidden: requires one of roles ${allowedRoles.join(", ")}`
    );
  }
  return membership;
}

export async function canManageCategories(userId: string, venueId: string) {
  const membership = await requireVenueAccess(userId, venueId);
  return membership.role === "owner" || membership.role === "manager";
}

export async function canManageItems(userId: string, venueId: string) {
  const membership = await requireVenueAccess(userId, venueId);
  return membership.role === "owner" || membership.role === "manager";
}

export async function canPublish(userId: string, venueId: string) {
  const membership = await requireVenueAccess(userId, venueId);
  return membership.role === "owner" || membership.role === "manager";
}

export async function getAccessibleVenues(userId: string) {
  return prisma.venueMember.findMany({
    where: { userId },
    include: { venue: true },
  });
}
