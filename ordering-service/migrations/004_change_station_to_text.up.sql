-- Change order_items.station from ENUM to TEXT to match Prisma's MenuItem.station (String)
-- Prisma allows any station value, but the enum only allowed 'KITCHEN'/'BAR'
-- This fixes the mismatch: adding items with custom stations would fail with a PG enum error

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_attribute a ON a.atttypid = t.oid
        WHERE t.typname = 'station'
          AND a.attrelid = 'order_items'::regclass
          AND a.attname = 'station'
    ) THEN
        ALTER TABLE order_items ALTER COLUMN station TYPE TEXT USING station::text;
    END IF;
END $$;
