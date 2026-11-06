import type { Product, Variant } from "../../lib/types";

export const isSoldOut = (p: Product) =>
  p.kind === "stock" && !p.variants.some((v) => v.enabled && (v.stock_qty ?? 0) > 0);

export const cartLimit = (p: Product, v: Variant) =>
  p.kind === "stock" ? Math.max(0, v.enabled ? (v.stock_qty ?? 0) : 0) : 99;

export const availableFirst = (a: Product, b: Product) =>
  Number(isSoldOut(a)) - Number(isSoldOut(b));
