
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  message: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
  email: string;
  message: string;
}

export interface MessageResponse {
  message: string;
}

export type UpdateProfileData = Partial<
  Pick<
    User,
    "username" | "email" | "first_name" | "last_name"
  >
>;
