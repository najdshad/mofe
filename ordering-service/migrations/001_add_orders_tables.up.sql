-- Extend existing enums (IF NOT EXISTS for idempotent re-runs)
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'DRAFT', 'PENDING', 'SENT', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM (
        'PENDING', 'SENT', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE station AS ENUM ('KITCHEN', 'BAR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: All price columns use INT to match Prisma's MenuItem.priceToman (Int).
-- Do NOT use DECIMAL — the Next.js app stores prices as integer tomans.
-- MenuItemVariant.priceModifier is also Int, added to base price.

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id               TEXT PRIMARY KEY,
    venue_id         TEXT NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
    waiter_id        TEXT NOT NULL REFERENCES "User"(id) ON DELETE SET NULL,

    table_number     TEXT,
    guest_count      INT DEFAULT 1,

    status           order_status DEFAULT 'PENDING',

    subtotal         INT NOT NULL DEFAULT 0,
    total            INT NOT NULL DEFAULT 0,

    notes            TEXT,

    created_at       TIMESTAMPTZ DEFAULT NOW(),
    sent_to_kitchen_at TIMESTAMPTZ,
    ready_at         TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,

    -- Denormalized for queries
    created_by_name  TEXT,

    CONSTRAINT valid_totals CHECK (total >= 0 AND subtotal >= 0)
);

CREATE INDEX idx_orders_venue_status ON orders(venue_id, status, created_at DESC);
CREATE INDEX idx_orders_waiter ON orders(waiter_id, created_at DESC);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id               TEXT PRIMARY KEY,
    order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- Snapshot menu data at order time
    menu_item_id     TEXT NOT NULL,
    menu_item_name   TEXT NOT NULL,
    variant_id       TEXT,
    variant_name     TEXT,

    quantity         INT NOT NULL CHECK (quantity > 0),
    unit_price       INT NOT NULL,
    total_price      INT NOT NULL,

    station          station NOT NULL,
    status           item_status DEFAULT 'PENDING',

    notes            TEXT,

    sent_at          TIMESTAMPTZ,
    preparing_at     TIMESTAMPTZ,
    ready_at         TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,

    course_number    INT DEFAULT 1,

    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_station_status ON order_items(station, status);

-- Audit: reuse the existing Prisma AuditLog model
