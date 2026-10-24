CREATE TABLE IF NOT EXISTS store_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_categories(name) VALUES
('上衣'),('下身'),('配件'),('鞋子'),('香氛'),('保養品'),('清潔'),('彩妝'),('公仔'),('周邊'),('娃娃'),('品牌周邊');
UPDATE products SET category='下身' WHERE category IN ('褲款','褲子');

INSERT OR IGNORE INTO store_brands(name) VALUES
('MLB'),('MUCENT'),('OFUSE'),('Mardi Mercredi'),('as”on'),('ROCKFISH'),('LEE'),
('Marithe Francois Girbaud'),('DISCOVERY'),('SPAO'),('CARLYN'),('NICK&NICOLE'),
('MUAHMUAH'),('FALLETT'),('FANCY CLUB'),('fennec'),('Matin Kim'),('COVERNAT'),
('Ames'),('What it isNt'),('WACKY WILLY'),('WHO.A.U'),('Muah Muah'),('GLOWNY'),
('OIOI'),('STAND OIL'),('emis'),('THISISNEVERTHAT'),('mahagrid'),('SCULPTOR'),
('Rest & Recreation'),('ADERERROR'),('Andersson Bell'),('MUSINSA STANDARD'),
('Acme de la Vie'),('ROMANTIC CROWN'),('adidas'),('adidas Originals'),('marie claire');
