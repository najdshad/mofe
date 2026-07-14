import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import {
  getCurrentSubscription,
  getSubscriptionUsage,
  changePlan,
} from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    if (!venueId) {
      return NextResponse.json({ error: "venueId required" }, { status: 400 });
    }
    await requireVenueAccess(user.id, venueId);

    const sub = await getCurrentSubscription(venueId);
    if (!sub) {
      return NextResponse.json({ subscription: null, usage: null });
    }

    const usage = await getSubscriptionUsage(venueId);

    return NextResponse.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        plan: {
          id: sub.plan.id,
          slug: sub.plan.slug,
          nameFa: sub.plan.nameFa,
          nameEn: sub.plan.nameEn,
          priceToman: sub.plan.priceToman,
          maxMenuItems: sub.plan.maxMenuItems,
          maxTables: sub.plan.maxTables,
          customDomain: sub.plan.customDomain,
          orderingEnabled: sub.plan.orderingEnabled,
        },
        trialEndsAt: sub.trialEndsAt,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        canceledAt: sub.canceledAt,
      },
      usage: {
        itemCount: usage.itemCount,
        tableCount: usage.tableCount,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { venueId, planId } = body;

    if (!venueId || !planId) {
      return NextResponse.json({ error: "venueId and planId required" }, { status: 400 });
    }
    await requireVenueAccess(user.id, venueId);

    const newPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!newPlan || !newPlan.purchasable) {
      return NextResponse.json({ error: "طرح نامعتبر است" }, { status: 400 });
    }

    const sub = await getCurrentSubscription(venueId);
    if (!sub) {
      return NextResponse.json({ error: "اشتراکی یافت نشد" }, { status: 404 });
    }

    if (sub.plan.id === planId) {
      return NextResponse.json({ error: "طرح فعلی شما همین است" }, { status: 400 });
    }

    const result = await changePlan(venueId, planId);

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "subscription.change_plan",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { fromPlan: sub.plan.slug, toPlan: newPlan.slug, ...result },
    });

    const updatedSub = await getCurrentSubscription(venueId);

    return NextResponse.json({
      success: true,
      ...result,
      subscription: updatedSub
        ? {
            id: updatedSub.id,
            status: updatedSub.status,
            plan: {
              slug: updatedSub.plan.slug,
              nameFa: updatedSub.plan.nameFa,
              priceToman: updatedSub.plan.priceToman,
            },
            currentPeriodEnd: updatedSub.currentPeriodEnd,
          }
        : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
