import { prisma } from "./prisma";
import { ApiError } from "./api-helpers";

export type Role = "owner" | "manager";
const VALID_ROLES: Role[] = ["owner", "manager"];

function ensureValidRole(role: string): Role {
  if (!VALID_ROLES.includes(role as Role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return role as Role;
}

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

export async function requireRole(
  userId: string,
  venueId: string,
  allowedRoles: Role[]
) {
  const membership = await requireVenueAccess(userId, venueId);
  const role = ensureValidRole(membership.role);
  if (!allowedRoles.includes(role)) {
    throw new ApiError(
      `Forbidden: requires one of roles ${allowedRoles.join(", ")}`,
      403
    );
  }
  return membership;
}

export async function canManage(userId: string, venueId: string) {
  const membership = await requireVenueAccess(userId, venueId);
  const role = ensureValidRole(membership.role);
  return role === "owner" || role === "manager";
}

export async function getAccessibleVenues(userId: string) {
  return prisma.venueMember.findMany({
    where: { userId },
    include: { venue: true },
  });
}
