
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { User } from "../types/auth";

import {
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../utils/auth";

import {
  saveToken,
  getToken,
  deleteToken,
} from "../utils/tokenStorage";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (
    username: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const token = await getToken();

        if (!token) {
          return;
        }

        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.log("Session validation failed:", error);

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function signIn(
    username: string,
    password: string
  ): Promise<void> {
    const response = await loginUser(username, password);

    await saveToken(response.token);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      await deleteToken();
      throw error;
    }
  }

  async function signOut(): Promise<void> {
    await logoutUser();
    await deleteToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "AuthProvider must be used within AuthProvider."
    );
  }

  return context;
}
