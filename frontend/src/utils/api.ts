import { getToken } from "./tokenStorage";
import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiUrl(): string {
  // Emulador de Android
  if (Platform.OS === "android" && !Constants.expoConfig?.hostUri) {
    return "http://10.0.2.2:8000";
  }

  // Servidor de desarrollo Expo
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }

  // Fallback local por defecto
  return "http://127.0.0.1:8000";
}

export const API_URL = getApiUrl();

export const DEFAULT_TIMEOUT_MS = 5000;

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

// Función unificada para realizar peticiones HTTP (autenticadas y públicas) con límite de tiempo y captura de errores
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

  // Adjunta el token si el endpoint requiere autenticación
  if (requiresAuth) {
    const token = await getToken();
    if (!token) {
      throw new Error("No hay una sesión activa.");
    }
    headers.set("Authorization", `Token ${token}`);
  }

  // Configura Content-Type en application/json solo si el body no es FormData
  if (body && !(body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const url = resolveUrl(endpoint);
  const controller = new AbortController();
  let isTimeout = false;

  // Escucha cancelaciones externas si fueron pasadas en options
  let abortListener: (() => void) | null = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      externalSignal.addEventListener("abort", abortListener);
    }
  }

  // Temporizador para el límite de tiempo de la petición
  const timeoutId = setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;

  // Ejecución de la petición protegida con un catch unificado para caídas de red y servidor apagado
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
        `Tiempo de espera agotado: El servidor tardó más de ${timeoutMs / 1000} segundos en responder.`
      );
    }
    if (error instanceof Error && error.name === "AbortError" && !isTimeout) {
      throw error;
    }
    throw new Error(
      "No se pudo conectar con el servidor. Revisa tu conexión."
    );
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && abortListener) {
      externalSignal.removeEventListener("abort", abortListener);
    }
  }

  // Respuesta sin contenido (ej. status 204 en eliminaciones)
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
      throw new Error("La sesión ha expirado o no es válida.");
    }

    if (response.status === 429) {
      throw new Error("Demasiados intentos. Intenta nuevamente más tarde.");
    }

    // Extrae errores de validación de serializers o modelos de Django
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

    throw new Error(`Error del servidor (${response.status}). Intenta nuevamente.`);
  }

  return data as T;
}

// Envuelve apiRequest forzando la autenticación para endpoints protegidos
export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    requiresAuth: true,
  });
}
