import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayment } from "@/lib/zarinpal";
import { extendSubscription } from "@/lib/subscription";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");
    const isMock = searchParams.get("mock") === "1";

    if (!authority || (status !== "OK" && !isMock)) {
      return NextResponse.redirect(
        new URL("/login?payment=failed", request.url)
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { authority },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.redirect(
        new URL("/login?payment=invalid", request.url)
      );
    }

    const sub = invoice.subscription;
    const venueId = sub.venueId;

    if (!isMock) {
      const result = await verifyPayment(authority, invoice.amountToman);
      if (!result.success) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "failed" },
        });
        return NextResponse.redirect(
          new URL(`/admin/${venueId}/billing?payment=failed`, request.url)
        );
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          refId: result.refId,
          cardPan: result.cardPan,
          paidAt: new Date(),
        },
      });
    } else {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          refId: `dev_ref_${Date.now()}`,
          paidAt: new Date(),
        },
      });
    }

    await extendSubscription(venueId);

    await logAudit({
      venueId,
      action: "billing.payment_completed",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { amount: invoice.amountToman, authority },
    });

    return NextResponse.redirect(
      new URL(`/admin/${venueId}/billing?payment=success`, request.url)
    );
  } catch (e) {
    console.error("[billing/callback] error:", e);
    return NextResponse.redirect(
      new URL("/login?payment=error", request.url)
    );
  }
}
