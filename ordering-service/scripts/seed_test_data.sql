-- Seed test data for ordering-service
-- Requires existing venues and users in the Prisma-managed tables

-- Insert 2 orders with items in different statuses
-- Assumes the first venue and first waiter in the DB

DO $$
DECLARE
    v_venue_id TEXT;
    v_waiter_id TEXT;
    v_order1_id TEXT := gen_random_uuid()::text;
    v_order2_id TEXT := gen_random_uuid()::text;
    v_item1_id TEXT := gen_random_uuid()::text;
    v_item2_id TEXT := gen_random_uuid()::text;
    v_item3_id TEXT := gen_random_uuid()::text;
    v_item4_id TEXT := gen_random_uuid()::text;
    v_menu_item_id TEXT;
BEGIN
    -- Get a venue and a user who is a member
    SELECT vm."venueId", vm."userId" INTO v_venue_id, v_waiter_id
    FROM "VenueMember" vm
    LIMIT 1;

    IF v_venue_id IS NULL THEN
        RAISE NOTICE 'No venue members found. Skipping seed.';
        RETURN;
    END IF;

    -- Get a menu item from this venue
    SELECT id INTO v_menu_item_id
    FROM "MenuItem"
    WHERE "venueId" = v_venue_id
    LIMIT 1;

    -- Order 1: SENT status with 2 items (1 SENT, 1 PREPARING)
    INSERT INTO orders (id, venue_id, waiter_id, table_number, guest_count, status, subtotal, total, notes, created_by_name)
    VALUES (v_order1_id, v_venue_id, v_waiter_id, '5', 3, 'SENT', 450000, 450000, 'Extra napkins please', 'Test Waiter');

    INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, sent_at, course_number)
    VALUES (v_item1_id, v_order1_id, COALESCE(v_menu_item_id, 'unknown'), 'Test Item 1', 2, 150000, 300000, 'KITCHEN', 'SENT', NOW(), 1);

    INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, sent_at, preparing_at, course_number)
    VALUES (v_item2_id, v_order1_id, COALESCE(v_menu_item_id, 'unknown'), 'Test Item 2', 1, 150000, 150000, 'BAR', 'PREPARING', NOW(), NOW(), 1);

    -- Order 2: READY status with 2 items (both READY)
    INSERT INTO orders (id, venue_id, waiter_id, table_number, guest_count, status, subtotal, total, created_by_name, sent_to_kitchen_at, ready_at)
    VALUES (v_order2_id, v_venue_id, v_waiter_id, '3', 2, 'READY', 300000, 300000, 'Test Waiter', NOW() - interval '15 minutes', NOW() - interval '5 minutes');

    INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, sent_at, ready_at, course_number)
    VALUES (v_item3_id, v_order2_id, COALESCE(v_menu_item_id, 'unknown'), 'Test Item 3', 1, 200000, 200000, 'KITCHEN', 'READY', NOW() - interval '15 minutes', NOW() - interval '5 minutes', 1);

    INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, sent_at, ready_at, course_number)
    VALUES (v_item4_id, v_order2_id, COALESCE(v_menu_item_id, 'unknown'), 'Test Item 4', 1, 100000, 100000, 'KITCHEN', 'READY', NOW() - interval '15 minutes', NOW() - interval '5 minutes', 1);

    RAISE NOTICE 'Seed data inserted: 2 orders with items';
END $$;
