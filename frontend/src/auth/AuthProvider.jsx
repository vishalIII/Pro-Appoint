import { useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";

const STORAGE_KEYS = {
  user: "auth_user",
  token: "auth_token"
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user) || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readStoredToken = () => localStorage.getItem(STORAGE_KEYS.token) || null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(readStoredToken);

  const login = (payload) => {
    const nextUser = payload?.user || null;
    const nextToken = payload?.token || null;

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));

    if (nextToken) {
      localStorage.setItem(STORAGE_KEYS.token, nextToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
    }

    localStorage.removeItem("user");

    setUser(nextUser);
    setToken(nextToken);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      logout
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
