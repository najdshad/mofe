-- Add COMPLETED to order_status enum (idempotent)
DO $$ BEGIN
    ALTER TYPE order_status ADD VALUE 'COMPLETED' AFTER 'DELIVERED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add completed_at timestamp column (idempotent)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
