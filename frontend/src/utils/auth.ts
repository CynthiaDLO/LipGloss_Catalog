import { API_URL, fetchWithAuth } from "./api";

import type {
  User,
  RegisterData,
  RegisterResponse,
  LoginResponse,
  MessageResponse,
  UpdateProfileData,
} from "../types/auth";


async function parseResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get("content-type") ?? "";

  const responseText = await response.text();

  console.log("API status:", response.status);
  console.log("API URL:", response.url);
  console.log("API content type:", contentType);

  // The backend must return JSON.
  if (!contentType.toLowerCase().includes("application/json")) {
    console.error(
      "Unexpected API response:",
      responseText.substring(0, 300)
    );

    throw new Error(
      `El servidor devolvió una respuesta inválida (${response.status}). Revisa la URL de Django y su terminal.`
    );
  }

  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "El servidor devolvió un JSON incorrecto."
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Demasiados intentos. Intenta nuevamente más tarde."
      );
    }

    // Django serializer field errors
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
    }

    throw new Error(
      `No se pudo completar la solicitud (${response.status}).`
    );
  }

  return data as T;
}


export async function registerUser(
  userData: RegisterData
): Promise<RegisterResponse> {
  const response = await fetch(
    `${API_URL}/api/auth/register/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    }
  );

  return parseResponse<RegisterResponse>(response);
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_URL}/api/auth/login/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    }
  );

  return parseResponse<LoginResponse>(response);
}

export async function getCurrentUser(): Promise<User> {
  return fetchWithAuth<User>("/api/auth/me/");
}

export async function updateProfile(
  userData: UpdateProfileData
): Promise<User> {
  return fetchWithAuth<User>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
}

export async function logoutUser(): Promise<MessageResponse> {
  return fetchWithAuth<MessageResponse>(
    "/api/auth/logout/",
    {
      method: "POST",
    }
  );
}

export async function resetToken(): Promise<{
  token: string;
  message: string;
}> {
  return fetchWithAuth(
    "/api/auth/reset-token/",
    {
      method: "POST",
    }
  );
}
