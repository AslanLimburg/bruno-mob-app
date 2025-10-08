import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);

  const login = async (email, password) => {
    // Твой постоянный аккаунт
    const validEmail = "a.con@mail.ru";
    const validPassword = "Aslan1967";

    if (email === validEmail && password === validPassword) {
      const userData = {
        email,
        name: "Aslan Hasanli",
        referralCode: "BR12345",
        membershipTier: "Gold",
        balances: { BTC: 0.0023, ETH: 0.14, BRT: 5.5 },
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setIsAuthenticated(true);
      return { success: true };
    } else {
      return { success: false, message: "Invalid credentials" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  const register = async () => ({ success: false, message: "Registration disabled in demo mode" });
  const verifyEmail = async () => ({ success: true });

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, 
register, verifyEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

