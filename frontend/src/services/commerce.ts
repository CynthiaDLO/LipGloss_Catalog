import { fetchWithAuth } from "../utils/api";
import type { Cart, Order, OrderStatus } from "../types/commerce";

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} debe ser un número entero positivo.`);
  }
}
export function toMoney(value: string | number): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "Importe no disponible";
}
export const getCart = () => fetchWithAuth<Cart>("/api/cart/");
export function addCartItem(productId: number, quantity = 1): Promise<Cart> {
  positiveInteger(productId, "El producto");
  positiveInteger(quantity, "La cantidad");
  if (quantity > 99) throw new Error("La cantidad máxima es de 99 unidades.");
  return fetchWithAuth<Cart>("/api/cart/items/", {
    method: "POST", body: JSON.stringify({ product_id: productId, quantity }),
  });
}
export function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  positiveInteger(itemId, "El artículo");
  positiveInteger(quantity, "La cantidad");
  if (quantity > 99) throw new Error("La cantidad máxima es de 99 unidades.");
  return fetchWithAuth<Cart>(`/api/cart/items/${itemId}/`, {
    method: "PATCH", body: JSON.stringify({ quantity }),
  });
}
export function removeCartItem(itemId: number): Promise<void> {
  positiveInteger(itemId, "El artículo");
  return fetchWithAuth<void>(`/api/cart/items/${itemId}/`, { method: "DELETE" });
}
export function checkoutOrder(key: string): Promise<Order> {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(key)) {
    throw new Error("La clave de compra no es válida.");
  }
  return fetchWithAuth<Order>("/api/orders/checkout/", {
    method: "POST", body: JSON.stringify({ idempotency_key: key }),
  });
}
export const getOrders = () => fetchWithAuth<Order[]>("/api/orders/");
export const getAdminOrders = () => fetchWithAuth<Order[]>("/api/admin/orders/");
export function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  positiveInteger(orderId, "El pedido");
  return fetchWithAuth<Order>(`/api/admin/orders/${orderId}/status/`, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
}
