import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authAPI } from "../services/api";

export interface AuthUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  perfil_id: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  nombreCompleto: () => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gesta_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("gesta_access_token");
        localStorage.removeItem("gesta_refresh_token");
        localStorage.removeItem("gesta_rol");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (usuario: string, password: string) => {
    const result = await authAPI.login(usuario, password);
    const authUser = result.user as AuthUser;
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(() => {
    authAPI.logout();
    localStorage.removeItem("gesta_rol");
    setUser(null);
  }, []);

  const nombreCompleto = useCallback(() => {
    if (!user) return "";
    return `${user.first_name} ${user.last_name}`.trim();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, nombreCompleto }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
