
import type { RegisterData } from "../types/auth";

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

export interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const usernamePattern = /^[\w.@+-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(
  data: LoginData
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.username.trim()) {
    errors.username = "Ingresa tu nombre de usuario.";
  }

  if (!data.password) {
    errors.password = "Ingresa tu contraseña.";
  }

  return errors;
}

export function validateRegister(
  data: RegisterFormData
): ValidationErrors {
  const errors: ValidationErrors = {};

  const username = data.username.trim();
  const email = data.email.trim();

  // Username validation
  if (!username) {
    errors.username = "Ingresa un nombre de usuario.";
  } else if (username.length < 3) {
    errors.username =
      "El usuario debe tener al menos 3 caracteres.";
  } else if (username.length > 150) {
    errors.username =
      "El usuario no puede superar los 150 caracteres.";
  } else if (!usernamePattern.test(username)) {
    errors.username =
      "El nombre de usuario contiene caracteres no permitidos.";
  }

  // Email validation
  if (!email) {
    errors.email = "Ingresa tu correo electrónico.";
  } else if (
    email.length > 254 ||
    !emailPattern.test(email)
  ) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  // Password validation
  if (!data.password) {
    errors.password = "Ingresa una contraseña.";
  } else if (data.password.length < 8) {
    errors.password =
      "La contraseña debe tener al menos 8 caracteres.";
  } else if (/^\d+$/.test(data.password)) {
    errors.password =
      "La contraseña no puede contener solamente números.";
  }

  // Password confirmation
  if (!data.confirmPassword) {
    errors.confirmPassword =
      "Confirma tu contraseña.";
  } else if (
    data.password !== data.confirmPassword
  ) {
    errors.confirmPassword =
      "Las contraseñas no coinciden.";
  }

  return errors;
}
