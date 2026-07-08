CREATE TABLE "Sale" (
    id           TEXT PRIMARY KEY,
    venue_id     TEXT NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
    order_id     TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    total        INT NOT NULL CHECK (total >= 0),
    item_count   INT NOT NULL CHECK (item_count >= 0),
    completed_at TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_venue_completed ON "Sale"(venue_id, completed_at DESC);
