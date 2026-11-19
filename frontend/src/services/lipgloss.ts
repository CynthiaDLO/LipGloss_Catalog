
import { fetchWithAuth } from "../utils/api";

import type {
  Lipgloss,
  PaginatedResponse,
} from "../types/Lipgloss";

const ENDPOINT = "/api/lipglosses/";

// Retrieve the lipgloss catalog.
export async function getLipglosses(): Promise<Lipgloss[]> {
  const data = await fetchWithAuth<
    Lipgloss[] | PaginatedResponse<Lipgloss>
  >(ENDPOINT);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  throw new Error(
    "El servidor devolvió un catálogo inválido."
  );
}

// Retrieve a specific lipgloss.
export async function getLipgloss(
  id: number
): Promise<Lipgloss> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("El producto seleccionado no es válido.");
  }

  return fetchWithAuth<Lipgloss>(
    `${ENDPOINT}${id}/`
  );
}
