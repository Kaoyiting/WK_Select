CREATE TABLE IF NOT EXISTS store_menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'all' CHECK (action IN ('all','new','brand','live','stock','korea','japan','sale','category','custom')),
  action_value TEXT NOT NULL DEFAULT '',
  parent_id INTEGER REFERENCES store_menu_items(id) ON DELETE CASCADE,
  placement TEXT NOT NULL DEFAULT 'both' CHECK (placement IN ('both','header','sidebar')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_menu_items(id,label,action,placement,sort_order) VALUES
(1,'全部商品','all','both',0),
(14,'本週新品','new','both',10),
(15,'品牌','brand','both',20),
(16,'限時連線','live','both',30),
(17,'現貨專區','stock','both',40),
(18,'🇰🇷 韓國選品','korea','both',50),
(19,'🇯🇵 日本代購','japan','both',60),
(20,'限時特價','sale','both',70);

INSERT OR IGNORE INTO store_menu_items(id,label,action,action_value,parent_id,placement,sort_order)
SELECT 1000+id,name,'category',name,1,'both',id FROM store_categories;
