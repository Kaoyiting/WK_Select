import type { Product } from "./types";
export function isSaleActive(p:Product){const t=Date.now();return p.sale_amount!==null && (!p.sale_starts_at || Date.parse(p.sale_starts_at)<=t) && (!p.sale_ends_at || t<Date.parse(p.sale_ends_at));}
export function unitPrice(p:Product){return (isSaleActive(p)?p.sale_amount:p.price_amount) ?? 0;}
