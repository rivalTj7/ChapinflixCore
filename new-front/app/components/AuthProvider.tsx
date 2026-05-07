"use client";
import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = Cookies.get("access_token");
    if (savedToken) {
      setTokenState(savedToken);
    }
    setLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      Cookies.set("access_token", newToken);
    } else {
      Cookies.remove("access_token");
    }
  };

  return (
    <AuthContext.Provider value={{ token, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}