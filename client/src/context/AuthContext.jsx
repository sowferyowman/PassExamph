import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest, logout as logoutRequest, me, register as registerRequest } from "../api/authApi";
import { logoutUser, setAuthenticatedUser } from "../services/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { me().then((result) => { setUser(result.user); setAuthenticatedUser(result.user); }).catch(() => { setUser(null); logoutUser(); }).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({
    user,
    loading,
    login: async (identifier, password) => {
      const result = await loginRequest(identifier, password);
      setUser(result.user);
      setAuthenticatedUser(result.user);
      return result.user;
    },
    register: async (payload) => {
      const result = await registerRequest(payload);
      setUser(result.user);
      setAuthenticatedUser(result.user);
      return result.user;
    },
    logout: async () => { await logoutRequest().catch(() => {}); logoutUser(); setUser(null); }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() { return useContext(AuthContext); }
