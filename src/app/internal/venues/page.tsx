import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InternalVenuesClient } from "./InternalVenuesClient";

export default async function InternalVenuesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "internal") redirect("/login");

  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const users = await prisma.user.findMany({
    where: { role: "user", status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <InternalVenuesClient
      venues={venues.map((v) => ({
        id: v.id,
        nameFa: v.nameFa,
        nameEn: v.nameEn,
        slug: v.slug,
        publicStatus: v.publicStatus,
        timezone: v.timezone,
        createdAt: v.createdAt.toISOString(),
        members: v.members.map((m) => ({
          user: { id: m.user.id, name: m.user.name, email: m.user.email },
        })),
      }))}
      users={users}
    />
  );
}
