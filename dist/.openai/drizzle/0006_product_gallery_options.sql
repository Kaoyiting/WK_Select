ALTER TABLE products ADD COLUMN sale_price INTEGER;
ALTER TABLE products ADD COLUMN gallery TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN colors TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN sizes TEXT NOT NULL DEFAULT '[]';

UPDATE products SET
  sale_price=NULL,
  gallery='["assets/products/aeae-web-logo-hoodie.png","assets/products/aeae-hoodie-gray.png","assets/products/aeae-hoodie-blue.png","assets/products/aeae-hoodie-oatmeal.png","assets/products/aeae-hoodie-navy.png"]',
  colors='["深藍","灰色","藍紫","燕麥色"]',
  sizes='[]'
WHERE id=5;

UPDATE products SET
  sale_price=NULL,
  gallery='["assets/products/mlb-cat-ear-beanie.png"]',
  colors='["黑色"]',
  sizes='["Free size"]'
WHERE id=6;

UPDATE products SET
  sale_price=NULL,
  gallery='["assets/products/wackywilly-knit.png","assets/products/wackywilly-knit-cream.png","assets/products/wackywilly-knit-black.png"]',
  colors='["燕麥色","黑色"]',
  sizes='[]'
WHERE id=9;

UPDATE products SET
  sale_price=NULL,
  gallery='["assets/products/cgp-waterproof-hooded-jacket.png"]',
  colors='["黑色"]',
  sizes='[]'
WHERE id=10;

UPDATE products SET original_price=NULL WHERE id IN (5,6,9,10);
