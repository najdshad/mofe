-- Revert: change order_items.station back to ENUM
-- NOTE: If data contains values other than 'KITCHEN'/'BAR', this will fail

ALTER TABLE order_items ALTER COLUMN station TYPE station USING station::station;
