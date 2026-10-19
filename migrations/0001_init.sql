PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id         INTEGER PRIMARY KEY,
  name_fa    TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_categories_order ON categories (sort_order);

CREATE TABLE items (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_fa     TEXT NOT NULL,
  name_en     TEXT,
  description TEXT,
  price_toman INTEGER NOT NULL DEFAULT 0 CHECK (price_toman >= 0),
  is_sold_out INTEGER NOT NULL DEFAULT 0 CHECK (is_sold_out IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_items_category_order ON items (category_id, sort_order);

CREATE TABLE variants (
  id          INTEGER PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name_fa     TEXT NOT NULL,
  name_en     TEXT,
  price_delta INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_variants_item_order ON variants (item_id, sort_order);

CREATE TABLE settings (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  name_fa          TEXT NOT NULL,
  name_en          TEXT,
  welcome_message  TEXT,
  meta_description TEXT,
  logo_data_url    TEXT
);

CREATE TABLE login_attempts (
  ip       TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX idx_login_attempts_reset ON login_attempts (reset_at);
