import { getToken } from "./tokenStorage";
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

export const DEFAULT_TIMEOUT_MS = 10000;

export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
}

function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${normalizedEndpoint}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    requiresAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: customHeaders,
    body,
    signal: externalSignal,
    ...restOptions
  } = options;

  const headers = new Headers(customHeaders);

  if (requiresAuth) {
    const token = await getToken();
    if (!token) {
      throw new Error("No active session found.");
    }
    headers.set("Authorization", `Token ${token}`);
  }

  if (body && !(body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const url = resolveUrl(endpoint);
  const controller = new AbortController();
  let isTimeout = false;

  let abortListener: (() => void) | null = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      externalSignal.addEventListener("abort", abortListener);
    }
  }

  const timeoutId = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;

  try {
    response = await fetch(url, {
      ...restOptions,
      body,
      headers,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (isTimeout) {
      throw new Error(
        `Request timeout: The server took longer than ${timeoutMs / 1000} seconds to respond.`
      );
    }
    if (error instanceof Error && error.name === "AbortError" && !isTimeout) {
      throw error;
    }
    throw new Error(
      "Unable to connect to the server. Please check your network connection and verify that the backend is running."
    );
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && abortListener) {
      externalSignal.removeEventListener("abort", abortListener);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  let data: any = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired or invalid. Please sign in again.");
    }

    if (response.status === 429) {
      throw new Error("Too many requests. Please try again later.");
    }

    // Extract Django serializer / API validation errors
    if (data && typeof data === "object") {
      for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length > 0) {
          throw new Error(String(value[0]));
        }
      }

      if (typeof data.message === "string") {
        throw new Error(data.message);
      }

      if (typeof data.detail === "string") {
        throw new Error(data.detail);
      }

      if (typeof data.error === "string") {
        throw new Error(data.error);
      }
    }

    if (typeof data === "string" && data.trim().length > 0 && data.length < 200) {
      throw new Error(data.trim());
    }

    throw new Error(`Server error (${response.status}). Please try again.`);
  }

  return data as T;
}

export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    requiresAuth: true,
  });
}
