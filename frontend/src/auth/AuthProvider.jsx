import { useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { logoutRequest } from "./authApi";

const STORAGE_KEYS = {
  user: "auth_user",
  token: "accessToken" // align with axios client
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
    localStorage.removeItem("auth_token"); // cleanup old key

    setUser(nextUser);
    setToken(nextToken);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      // ignore network errors on logout
      console.warn("Logout request failed:", error?.message || error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.user);
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setToken(null);
    }
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
