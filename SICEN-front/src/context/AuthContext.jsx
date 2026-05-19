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

async function syncUnitCacheWithUser(userObj, forceRefresh) {
  if (!userObj?.unit?.trim()) {
    api.clearUserUnitCache();
    return;
  }
  const ac = userObj.unit.trim().toUpperCase();
  if (!forceRefresh) {
    const c = api.readUserUnitCache();
    if (c?.acronym === ac) return;
  }
  try {
    const data = await api.getUnit(ac);
    api.writeUserUnitCache(ac, data.unit ?? null);
  } catch {
    api.writeUserUnitCache(ac, null);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getMe();
      const u = data.user ?? null;
      await syncUnitCacheWithUser(u, false);
      setUser(u);
    } catch {
      api.clearAuthToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    api.clearUserUnitCache();
    const data = await api.login(email, password);
    await syncUnitCacheWithUser(data.user, true);
    setUser(
      data.user
        ? { ...data.user, userTutorial: data.user.userTutorial === true }
        : data.user,
    );
    return data;
  }, []);

  const signup = useCallback(async (body) => {
    api.clearUserUnitCache();
    const data = await api.signup(body);
    await syncUnitCacheWithUser(data.user, true);
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
