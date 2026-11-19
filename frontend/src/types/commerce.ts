export interface CartProduct {
  id: number;
  name: string;
  shade: string;
  brand: string;
  price: string;
  image: string | null;
}
export interface CartItem {
  id: number;
  product: CartProduct;
  quantity: number;
  subtotal: string;
}
export interface Cart {
  items: CartItem[];
  item_count: number;
  total: string;
  updated_at: string;
}
export type OrderStatus = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
export interface OrderItem {
  id: number;
  lipgloss: number | null;
  product_name: string;
  brand_name: string;
  shade: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}
export interface Order {
  id: number;
  status: OrderStatus;
  status_display: string;
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  user?: number;
  username?: string;
}
