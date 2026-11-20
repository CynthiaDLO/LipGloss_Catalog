import { apiRequest, fetchWithAuth } from "./api";

import type {
  User,
  RegisterData,
  RegisterResponse,
  LoginResponse,
  MessageResponse,
  UpdateProfileData,
} from "../types/auth";

export async function registerUser(
  userData: RegisterData
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(userData),
    requiresAuth: false,
  });
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
    requiresAuth: false,
  });
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
