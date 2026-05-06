import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user ?? null);
    } catch {
      api.clearAuthToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const data = await api.login(email, password);
      setUser(data.user);
      return data;
    },
    []
  );

  const signup = useCallback(async (body) => {
    const data = await api.signup(body);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading: user === undefined,
      refresh,
      login,
      signup,
      logout,
    }),
    [user, refresh, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth dentro de AuthProvider");
  }
  return ctx;
}
