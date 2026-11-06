import type { Product } from "../../lib/types";

export function productPayload(p: Product, changes: Partial<Product> = {}) {
  const x = { ...p, ...changes };
  return {
    title: x.title,
    brand: x.brand,
    category: x.category,
    country: x.country,
    kind: x.kind,
    status: x.status,
    badge: x.badge,
    price_amount: x.price_amount,
    sale_amount: x.sale_amount,
    sale_starts_at: x.sale_starts_at || null,
    sale_ends_at: x.sale_ends_at || null,
    gallery: x.gallery,
    image_colors: x.image_colors || {},
    description_html: x.description_html,
    size_guide_html: x.size_guide_html,
    expected_version: x.version,
    variants: x.variants
      .filter((v) => v.enabled)
      .map(({ id, color, size, stock_qty, enabled }) => ({
        id,
        color,
        size,
        stock_qty,
        enabled,
      })),
  };
}