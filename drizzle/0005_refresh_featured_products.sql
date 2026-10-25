INSERT OR IGNORE INTO store_brands(name) VALUES ('aeae'), ('CGP');

UPDATE products SET
  title='aeae WEB LOGO HOODIE 連帽外套', brand='aeae', category='上衣', country='korea',
  type='預購', badge='', img='assets/products/aeae-web-logo-hoodie.png', price=2280,
  original_price=NULL, stock_qty=0, status='published', variants='', description='',
  date=20261025, updated_at=CURRENT_TIMESTAMP
WHERE id=5;

UPDATE products SET
  title='MLB 貓耳毛帽', brand='MLB', category='配件', country='korea',
  type='預購', badge='', img='assets/products/mlb-cat-ear-beanie.png', price=1280,
  original_price=NULL, stock_qty=0, status='published', variants='', description='',
  date=20261024, updated_at=CURRENT_TIMESTAMP
WHERE id=6;

UPDATE products SET
  title='Wackywilly 針織毛衣', brand='WACKY WILLY', category='上衣', country='korea',
  type='預購', badge='', img='assets/products/wackywilly-knit.png', price=890,
  original_price=NULL, stock_qty=0, status='published', variants='', description='',
  date=20261023, updated_at=CURRENT_TIMESTAMP
WHERE id=9;

UPDATE products SET
  title='CGP 防潑水黑色運動外套(連帽款）', brand='CGP', category='上衣', country='korea',
  type='預購', badge='', img='assets/products/cgp-waterproof-hooded-jacket.png', price=1240,
  original_price=NULL, stock_qty=0, status='published', variants='', description='',
  date=20261022, updated_at=CURRENT_TIMESTAMP
WHERE id=10;

UPDATE products SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=11;
