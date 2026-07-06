ALTER TYPE order_status ADD VALUE 'COMPLETED' AFTER 'DELIVERED';

-- Add completed_at timestamp column for tracking when payment was finalized
ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;
