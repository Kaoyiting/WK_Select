UPDATE store_menu_items
SET parent_id=1
WHERE id=21 AND label='商品類別';

UPDATE store_menu_items
SET parent_id=21
WHERE parent_id=1 AND action='category' AND id<>21;
