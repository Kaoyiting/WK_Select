
CREATE TABLE admin_accounts (
	id VARCHAR(36) NOT NULL, 
	username VARCHAR(80) NOT NULL, 
	password_hash TEXT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (username)
)

;

CREATE TABLE admin_login_attempts (
	key VARCHAR(64) NOT NULL, 
	count INTEGER NOT NULL, 
	window_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (key)
)

;

CREATE TABLE assets (
	id VARCHAR(36) NOT NULL, 
	object_key VARCHAR(500) NOT NULL, 
	mime_type VARCHAR(80) NOT NULL, 
	byte_size INTEGER NOT NULL, 
	width INTEGER NOT NULL, 
	height INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (object_key)
)

;

CREATE TABLE audit_logs (
	id VARCHAR(36) NOT NULL, 
	admin_id VARCHAR(36), 
	action VARCHAR(80) NOT NULL, 
	target_id VARCHAR(36) NOT NULL, 
	detail JSON NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE TABLE catalog_entries (
	id VARCHAR(36) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (kind, name)
)

;

CREATE TABLE idempotency_records (
	id VARCHAR(36) NOT NULL, 
	actor_id VARCHAR(36) NOT NULL, 
	operation VARCHAR(80) NOT NULL, 
	key VARCHAR(128) NOT NULL, 
	request_hash VARCHAR(64) NOT NULL, 
	response JSON, 
	PRIMARY KEY (id), 
	UNIQUE (actor_id, operation, key)
)

;

CREATE TABLE members (
	id VARCHAR(36) NOT NULL, 
	google_sub VARCHAR(255) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	display_name VARCHAR(120) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (google_sub)
)

;

CREATE TABLE navigation_items (
	id VARCHAR(36) NOT NULL, 
	parent_id VARCHAR(36), 
	label VARCHAR(160) NOT NULL, 
	action VARCHAR(30) NOT NULL, 
	action_value VARCHAR(500) NOT NULL, 
	placement VARCHAR(20) NOT NULL, 
	sort_order INTEGER NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES navigation_items (id)
)

;

CREATE TABLE products (
	id VARCHAR(36) NOT NULL, 
	legacy_id INTEGER, 
	title VARCHAR(240) NOT NULL, 
	brand VARCHAR(120) NOT NULL, 
	category VARCHAR(120) NOT NULL, 
	country VARCHAR(20) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	badge VARCHAR(80) NOT NULL, 
	price_amount INTEGER, 
	sale_amount INTEGER, 
	gallery JSON NOT NULL, 
	description_html TEXT NOT NULL, 
	size_guide_html TEXT NOT NULL, 
	date INTEGER NOT NULL, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (price_amount IS NULL OR price_amount >= 0), 
	CHECK (sale_amount IS NULL OR (price_amount IS NOT NULL AND sale_amount >= 0 AND sale_amount < price_amount)), 
	UNIQUE (legacy_id)
)

;
CREATE INDEX ix_products_status ON products (status);

CREATE TABLE sessions (
	id VARCHAR(36) NOT NULL, 
	kind VARCHAR(10) NOT NULL, 
	principal_id VARCHAR(36) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	csrf_hash VARCHAR(64) NOT NULL, 
	csrf_token VARCHAR(100) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (token_hash)
)

;
CREATE INDEX ix_sessions_principal_id ON sessions (principal_id);

CREATE TABLE site_content (
	key VARCHAR(40) NOT NULL, 
	value JSON NOT NULL, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (key)
)

;

CREATE TABLE customers (
	id VARCHAR(36) NOT NULL, 
	member_id VARCHAR(36), 
	name VARCHAR(120) NOT NULL, 
	phone VARCHAR(30) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	notes TEXT NOT NULL, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (member_id), 
	FOREIGN KEY(member_id) REFERENCES members (id)
)

;

CREATE TABLE orders (
	id VARCHAR(36) NOT NULL, 
	order_number VARCHAR(40) NOT NULL, 
	member_id VARCHAR(36) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	subtotal_amount INTEGER NOT NULL, 
	shipping_amount INTEGER NOT NULL, 
	total_amount INTEGER NOT NULL, 
	receiver JSON NOT NULL, 
	store JSON NOT NULL, 
	shipping_method VARCHAR(30) NOT NULL, 
	payment_method VARCHAR(30) NOT NULL, 
	note TEXT NOT NULL, 
	version INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (order_number), 
	FOREIGN KEY(member_id) REFERENCES members (id)
)

;
CREATE INDEX ix_orders_member_id ON orders (member_id);

CREATE TABLE product_variants (
	id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36) NOT NULL, 
	color VARCHAR(120) NOT NULL, 
	size VARCHAR(80) NOT NULL, 
	stock_qty INTEGER, 
	enabled BOOLEAN NOT NULL, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CHECK (stock_qty IS NULL OR stock_qty >= 0), 
	UNIQUE (product_id, color, size), 
	FOREIGN KEY(product_id) REFERENCES products (id)
)

;
CREATE INDEX ix_product_variants_product_id ON product_variants (product_id);

CREATE TABLE order_items (
	id VARCHAR(36) NOT NULL, 
	order_id VARCHAR(36) NOT NULL, 
	product_id VARCHAR(36) NOT NULL, 
	variant_id VARCHAR(36) NOT NULL, 
	title VARCHAR(240) NOT NULL, 
	color VARCHAR(120) NOT NULL, 
	size VARCHAR(80) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	unit_amount INTEGER NOT NULL, 
	quantity INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(variant_id) REFERENCES product_variants (id)
)

;
CREATE INDEX ix_order_items_order_id ON order_items (order_id);

CREATE TABLE payments (
	id VARCHAR(36) NOT NULL, 
	order_id VARCHAR(36) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	amount INTEGER NOT NULL, 
	refunded_amount INTEGER NOT NULL, 
	reference VARCHAR(500) NOT NULL, 
	paid_at TIMESTAMP WITH TIME ZONE, 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (order_id), 
	FOREIGN KEY(order_id) REFERENCES orders (id)
)

;

CREATE TABLE purchase_requests (
	id VARCHAR(36) NOT NULL, 
	customer_id VARCHAR(36), 
	contact VARCHAR(500) NOT NULL, 
	requested_name VARCHAR(240) NOT NULL, 
	product_url TEXT NOT NULL, 
	color VARCHAR(120) NOT NULL, 
	size VARCHAR(80) NOT NULL, 
	quantity INTEGER NOT NULL, 
	source VARCHAR(80) NOT NULL, 
	notes TEXT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	product_id VARCHAR(36), 
	order_id VARCHAR(36), 
	version INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id)
)

;

CREATE TABLE shipments (
	id VARCHAR(36) NOT NULL, 
	order_id VARCHAR(36) NOT NULL, 
	tracking_number VARCHAR(100) NOT NULL, 
	confirmed_by VARCHAR(36) NOT NULL, 
	shipped_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (order_id), 
	FOREIGN KEY(order_id) REFERENCES orders (id), 
	FOREIGN KEY(confirmed_by) REFERENCES admin_accounts (id)
)

;
