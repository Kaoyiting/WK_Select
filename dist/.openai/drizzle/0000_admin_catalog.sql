CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '服飾',
  country TEXT NOT NULL DEFAULT 'korea',
  type TEXT NOT NULL DEFAULT '預購' CHECK (type IN ('現貨','預購')),
  badge TEXT NOT NULL DEFAULT '' CHECK (badge IN ('','本週新品','限時連線','限時特價')),
  img TEXT NOT NULL DEFAULT '',
  price INTEGER,
  original_price INTEGER,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','offline','archived')),
  variants TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  date INTEGER NOT NULL DEFAULT (CAST(strftime('%Y%m%d','now') AS INTEGER)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

INSERT INTO products (id,title,brand,category,country,type,badge,img,status,date) VALUES
(5,'韓系黑色短袖丹寧襯衫','韓系選品','上衣','korea','預購','','assets/products/denim-overshirt.jpg','published',20260702),
(6,'adidas 復古滾邊短袖上衣','adidas','上衣','korea','預購','','assets/products/adidas-ringer-tee.jpg','published',20260701),
(9,'韓系寬版休閒棉褲','韓系選品','褲款','korea','預購','','assets/products/relaxed-sweatpants.jpg','published',20260326),
(10,'marie claire 復古滾邊短袖','marie claire','上衣','korea','預購','','assets/products/marie-claire-tee.jpg','published',20260326),
(11,'adidas Originals 復古 Polo 上衣','adidas Originals','上衣','korea','預購','','assets/products/adidas-polo.jpg','published',20260323)
ON CONFLICT(id) DO NOTHING;
