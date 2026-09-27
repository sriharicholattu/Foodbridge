import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data.user);
          setRole(res.data.user.role);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.setItem("role", res.data.user.role);
        } catch (err) {
          console.error("Token validation failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: newToken, user: newUser } = res.data;
    
    setToken(newToken);
    setUser(newUser);
    setRole(newUser.role);
    
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("role", newUser.role);
    
    return newUser;
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    const { token: newToken, user: newUser } = res.data;
    
    setToken(newToken);
    setUser(newUser);
    setRole(newUser.role);
    
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("role", newUser.role);
    
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  };

  return (
    <AuthContext.Provider value={{ token, user, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
