PRAGMA foreign_keys = ON;

CREATE TABLE venues (
  id               INTEGER PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name_fa          TEXT NOT NULL,
  name_en          TEXT,
  welcome_message  TEXT,
  meta_description TEXT,
  logo_data_url    TEXT
);

-- The single menu from the pre-venue schema becomes the first venue.
INSERT INTO venues (slug, name_fa, name_en, welcome_message, meta_description, logo_data_url)
SELECT 'noghteh', name_fa, name_en, welcome_message, meta_description, logo_data_url
FROM settings WHERE id = 1;

INSERT INTO venues (slug, name_fa)
SELECT 'noghteh', 'کافه'
WHERE NOT EXISTS (SELECT 1 FROM venues);

-- Rebuild menu tables to scope categories (and their items) per venue.
-- Children are dropped first so foreign keys stay satisfied.
CREATE TABLE categories_v2 (
  id         INTEGER PRIMARY KEY,
  venue_id   INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name_fa    TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (venue_id, name_fa)
);

INSERT INTO categories_v2 (id, venue_id, name_fa, sort_order)
SELECT id, 1, name_fa, sort_order FROM categories;

CREATE TABLE items_v2 (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories_v2(id) ON DELETE RESTRICT,
  name_fa     TEXT NOT NULL,
  name_en     TEXT,
  description TEXT,
  price_toman INTEGER NOT NULL DEFAULT 0 CHECK (price_toman >= 0),
  is_sold_out INTEGER NOT NULL DEFAULT 0 CHECK (is_sold_out IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO items_v2 (id, category_id, name_fa, name_en, description, price_toman, is_sold_out, sort_order)
SELECT id, category_id, name_fa, name_en, description, price_toman, is_sold_out, sort_order FROM items;

CREATE TABLE variants_v2 (
  id          INTEGER PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES items_v2(id) ON DELETE CASCADE,
  name_fa     TEXT NOT NULL,
  name_en     TEXT,
  price_delta INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO variants_v2 (id, item_id, name_fa, name_en, price_delta, sort_order)
SELECT id, item_id, name_fa, name_en, price_delta, sort_order FROM variants;

DROP TABLE variants;
DROP TABLE items;
DROP TABLE categories;

ALTER TABLE categories_v2 RENAME TO categories;
ALTER TABLE items_v2 RENAME TO items;
ALTER TABLE variants_v2 RENAME TO variants;

CREATE INDEX idx_categories_order ON categories (venue_id, sort_order);
CREATE INDEX idx_items_category_order ON items (category_id, sort_order);
CREATE INDEX idx_variants_item_order ON variants (item_id, sort_order);

DROP TABLE settings;
