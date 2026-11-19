
import { getToken } from "../utils/tokenStorage";

import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiUrl(): string {
  // Android emulator
  if (Platform.OS === "android" && !Constants.expoConfig?.hostUri) {
    return "http://10.0.2.2:8000";
  }

  // Expo development server
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }

  // Local fallback
  return "http://127.0.0.1:8000";
}

export const API_URL = getApiUrl();


export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  if (!token) {
    throw new Error("No hay una sesión activa.");
  }

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Token ${token}`);

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "La sesión ha expirado o no es válida."
      );
    }

    throw new Error(
      `Error del servidor: ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
