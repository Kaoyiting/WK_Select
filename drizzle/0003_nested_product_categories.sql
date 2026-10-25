INSERT OR IGNORE INTO store_menu_items(id,label,action,action_value,parent_id,placement,sort_order)
VALUES(21,'商品類別','category','',1,'both',1);

UPDATE store_menu_items
SET parent_id=21
WHERE parent_id=1 AND action='category';
