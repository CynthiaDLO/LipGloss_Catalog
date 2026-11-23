import { fetchWithAuth } from "../utils/api";
import type { Brand, Lipgloss, PaginatedResponse } from "../types/Lipgloss";

export interface CatalogFilters {
  search?: string;
  brand?: number | null;
  minPrice?: string;
  maxPrice?: string;
  ordering?: "name" | "-name" | "price" | "-price" | "-created_at";
  page?: number;
  pageSize?: number;
}

export async function getCatalogPage(filters: CatalogFilters = {}): Promise<PaginatedResponse<Lipgloss>> {
  const params: string[] = [];
  const add = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && `${value}`.trim() !== "") {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  add("search", filters.search?.trim());
  add("brand", filters.brand);
  add("min_price", filters.minPrice);
  add("max_price", filters.maxPrice);
  add("ordering", filters.ordering);
  add("page", filters.page ?? 1);
  add("page_size", filters.pageSize ?? 10);
  const data = await fetchWithAuth<PaginatedResponse<Lipgloss> | Lipgloss[]>(`/api/lipglosses/?${params.join("&")}`);
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  if (data && Array.isArray(data.results) && typeof data.count === "number") return data;
  throw new Error("El servidor devolvió una lista de productos inválida.");
}

export async function getBrands(): Promise<Brand[]> {
  const result = await fetchWithAuth<Brand[] | PaginatedResponse<Brand>>("/api/brands/");
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.results)) return result.results;
  throw new Error("No fue posible cargar las marcas.");
}
export const getFavorites = () => fetchWithAuth<Lipgloss[]>("/api/favorites/");
export const addFavorite = (productId: number) => fetchWithAuth<{ product_id: number; is_favorite: boolean }>("/api/favorites/", { method: "POST", body: JSON.stringify({ product_id: productId }) });
export const removeFavorite = (productId: number) => fetchWithAuth<void>(`/api/favorites/${productId}/`, { method: "DELETE" });

/** Returns up to 5 active products marked as featured for the home carousel. */
export async function getFeaturedProducts(): Promise<Lipgloss[]> {
  const data = await fetchWithAuth<{ results: Lipgloss[] } | Lipgloss[]>("/api/lipglosses/?is_featured=true&page_size=5&ordering=-created_at");
  const list = Array.isArray(data) ? data : data.results;
  return list.filter(p => p.is_active && p.is_featured);
}
export interface UserPreferences { theme: "light" | "dark" | "system"; page_size: number; language: "es" | "en"; font_scale: string }
export const getPreferences = () => fetchWithAuth<UserPreferences>("/api/settings/");
export const savePreferences = (settings: Partial<UserPreferences>) => fetchWithAuth<UserPreferences>("/api/settings/", { method: "PATCH", body: JSON.stringify(settings) });
