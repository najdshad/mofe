import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InternalUsersClient } from "./InternalUsersClient";

export default async function InternalUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "internal") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return <InternalUsersClient users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />;
}
