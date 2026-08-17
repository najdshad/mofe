import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { validateCsrf } from "@/lib/csrf";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ENTRY_TYPES = new Set(["sale", "expense"]);
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;
const MAX_QUANTITY = 1000;
const MAX_AMOUNT_TOMAN = 2_147_483_647;

function optionalText(value: unknown, maxLength: number) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().replace(/^#+/, "").slice(0, MAX_TAG_LENGTH))
        .filter(Boolean),
    ),
  ).slice(0, MAX_TAGS);
}

function parseOccurredAt(value: unknown) {
  if (value == null || value === "") return new Date();
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeEntry<
  T extends {
    tags: string | null;
    saleItems: unknown[];
  },
>(entry: T) {
  return {
    ...entry,
    tags: entry.tags ? entry.tags.split(",").filter(Boolean) : [],
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const { searchParams } = new URL(request.url);
    const fromValue = searchParams.get("from");
    const toValue = searchParams.get("to");
    const type = searchParams.get("type");

    if (type && !ENTRY_TYPES.has(type)) {
      return NextResponse.json({ error: "نوع تراکنش نامعتبر است" }, { status: 400 });
    }

    const from = fromValue ? new Date(fromValue) : null;
    const to = toValue ? new Date(toValue) : null;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime())) ||
      (from && to && from > to)
    ) {
      return NextResponse.json({ error: "بازه زمانی نامعتبر است" }, { status: 400 });
    }

    const where: Prisma.LedgerEntryWhereInput = { venueId };
    if (type) where.type = type;
    if (from || to) {
      where.occurredAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      include: {
        saleItems: {
          orderBy: { itemName: "asc" },
        },
      },
    });

    return NextResponse.json({ entries: entries.map(serializeEntry) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> },
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);
    await validateCsrf();

    const body = await request.json();
    if (!ENTRY_TYPES.has(body.type)) {
      return NextResponse.json({ error: "نوع تراکنش نامعتبر است" }, { status: 400 });
    }

    const occurredAt = parseOccurredAt(body.occurredAt);
    if (!occurredAt) {
      return NextResponse.json({ error: "تاریخ تراکنش نامعتبر است" }, { status: 400 });
    }

    const description = optionalText(body.description, MAX_DESCRIPTION_LENGTH);
    const tags = normalizeTags(body.tags);

    if (body.type === "expense") {
      const amountToman = Number(body.amountToman);
      if (
        !Number.isInteger(amountToman) ||
        amountToman <= 0 ||
        amountToman > MAX_AMOUNT_TOMAN
      ) {
        return NextResponse.json({ error: "مبلغ هزینه نامعتبر است" }, { status: 400 });
      }

      const entry = await prisma.ledgerEntry.create({
        data: {
          venueId,
          type: "expense",
          amountToman,
          description,
          tags: tags.length ? tags.join(",") : null,
          occurredAt,
        },
        include: { saleItems: true },
      });

      return NextResponse.json(serializeEntry(entry), { status: 201 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "حداقل یک آیتم برای سفارش انتخاب کنید" }, { status: 400 });
    }

    const lines = new Map<string, { menuItemId: string; variantId: string | null; quantity: number }>();
    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem.menuItemId !== "string") {
        return NextResponse.json({ error: "آیتم سفارش نامعتبر است" }, { status: 400 });
      }
      const quantity = Number(rawItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return NextResponse.json({ error: "تعداد آیتم باید عددی بین ۱ تا ۱۰۰۰ باشد" }, { status: 400 });
      }
      let variantId: string | null;
      if (rawItem.variantId == null || rawItem.variantId === "") variantId = null;
      else if (typeof rawItem.variantId === "string") variantId = rawItem.variantId;
      else {
        return NextResponse.json({ error: "آیتم سفارش نامعتبر است" }, { status: 400 });
      }
      const key = `${rawItem.menuItemId}::${variantId ?? ""}`;
      const current = lines.get(key);
      lines.set(key, {
        menuItemId: rawItem.menuItemId,
        variantId,
        quantity: (current?.quantity ?? 0) + quantity,
      });
    }

    if ([...lines.values()].some((line) => line.quantity > MAX_QUANTITY)) {
      return NextResponse.json({ error: "تعداد آیتم باید عددی بین ۱ تا ۱۰۰۰ باشد" }, { status: 400 });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: [...new Set([...lines.values()].map((line) => line.menuItemId))] },
        venueId,
        deletedAt: null,
      },
      select: {
        id: true,
        nameFa: true,
        priceToman: true,
        variants: {
          select: { id: true, nameFa: true, priceModifier: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
    if (menuItemById.size !== new Set([...lines.values()].map((line) => line.menuItemId)).size) {
      return NextResponse.json({ error: "یک یا چند آیتم منو یافت نشد" }, { status: 400 });
    }

    const saleItems = [];
    for (const line of lines.values()) {
      const item = menuItemById.get(line.menuItemId);
      if (!item) {
        return NextResponse.json({ error: "یک یا چند آیتم منو یافت نشد" }, { status: 400 });
      }
      const variant = line.variantId
        ? item.variants.find((candidate) => candidate.id === line.variantId)
        : null;
      if (line.variantId && !variant) {
        return NextResponse.json({ error: "گزینه انتخاب‌شده برای آیتم معتبر نیست" }, { status: 400 });
      }
      const unitPriceToman = item.priceToman + (variant?.priceModifier ?? 0);
      if (unitPriceToman < 0) {
        return NextResponse.json({ error: "قیمت آیتم با گزینه انتخابی نامعتبر است" }, { status: 400 });
      }
      saleItems.push({
        menuItemId: item.id,
        variantId: variant?.id ?? null,
        variantName: variant?.nameFa ?? null,
        itemName: item.nameFa,
        unitPriceToman,
        quantity: line.quantity,
        totalToman: unitPriceToman * line.quantity,
      });
    }
    const amountToman = saleItems.reduce((sum, item) => sum + item.totalToman, 0);

    if (!Number.isSafeInteger(amountToman) || amountToman > MAX_AMOUNT_TOMAN) {
      return NextResponse.json({ error: "مبلغ سفارش بیش از حد مجاز است" }, { status: 400 });
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        venueId,
        type: "sale",
        amountToman,
        description,
        tags: null,
        occurredAt,
        saleItems: {
          create: saleItems,
        },
      },
      include: { saleItems: true },
    });

    return NextResponse.json(serializeEntry(entry), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
