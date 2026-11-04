export type Variant = {
  id?: string;
  color: string;
  size: string;
  stock_qty: number | null;
  enabled: boolean;
  version?: number;
};
export type Product = {
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  sale_active?: boolean;
  sales_count?: number;
  order_count?: number;
  view_count?: number;
  id: string;
  legacy_id: number | null;
  title: string;
  brand: string;
  category: string;
  country: string;
  kind: "stock" | "preorder";
  status: string;
  badge: string;
  price_amount: number | null;
  sale_amount: number | null;
  gallery: string[];
  image_colors?: Record<string, string>;
  description_html: string;
  size_guide_html: string;
  variants: Variant[];
  date: number;
  version: number;
};
export type Navigation = {
  id: string;
  parent_id: string | null;
  label: string;
  action: string;
  action_value: string;
  placement: string;
  sort_order: number;
  enabled: boolean;
  version: number;
};
export type Entry = { id: string; name: string };
export type Metadata = {
  brands: Entry[];
  categories: Entry[];
  navigation: Navigation[];
};
export type Content = Record<string, unknown> & {
  announcementRows: {
    id?: string;
    text: string;
    sortOrder: number;
    enabled: boolean;
  }[];
  heroSlides: {
    aspectRatio?: string;
    fit?: "contain" | "cover";
    id?: string;
    image: string;
    alt: string;
    sortOrder: number;
    enabled: boolean;
  }[];
  shippingFee: number;
  freeShippingThreshold: number;
};
export type CartItem = { product: Product; variant: Variant; quantity: number };
export type Session = {
  authenticated: boolean;
  name?: string;
  username?: string;
  email?: string;
  csrf_token: string;
  google_configured?: boolean;
};
export type Order = {
  is_test?: boolean;
  payment_deadline?: string | null;
  atm?: {bank_code:string;virtual_account:string;expires_on:string;status:string;merchant_trade_no:string} | null;
  id: string;
  order_number: string;
  status: string;
  subtotal_amount: number;
  shipping_amount: number;
  total_amount: number;
  receiver: { name: string; phone: string; email: string };
  store: { id: string; name: string; address: string };
  shipping_method: string;
  payment_method: string;
  note: string;
  version: number;
  created_at: string;
  items: {
    id: string;
    title: string;
    color: string;
    size: string;
    quantity: number;
    unit_amount: number;
    image_url?: string;
  }[];
  payment: {
    id: string;
    status: string;
    amount: number;
    refunded_amount: number;
    paid_at?:string|null;
    version: number;
  };
  tracking_number: string;
  shipped_at?: string | null;
};
