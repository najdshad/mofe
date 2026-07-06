import { prisma } from "@/lib/prisma";

export async function cleanStaleTableStatuses(venueId: string) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await prisma.venueTable.updateMany({
    where: {
      venueId,
      status: { not: "FREE" },
      updatedAt: { lt: cutoff },
    },
    data: { status: "FREE" },
  });
}
