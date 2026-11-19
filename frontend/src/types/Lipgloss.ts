
export interface Brand {
  id: number;
  name: string;
  description: string;
}

export interface Lipgloss {
  id: number;
  brand: Brand;
  name: string;
  shade: string;
  price: string;
  description: string;
  image: string | null;
  is_active: boolean;
  stock?: number | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
