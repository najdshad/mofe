-- Change order_items.station from ENUM to TEXT to match Prisma's MenuItem.station (String)
-- Prisma allows any station value, but the enum only allowed 'KITCHEN'/'BAR'
-- This fixes the mismatch: adding items with custom stations would fail with a PG enum error

ALTER TABLE order_items ALTER COLUMN station TYPE TEXT USING station::text;
