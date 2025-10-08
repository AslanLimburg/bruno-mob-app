#!/bin/bash

echo "🎨 Creating Auth Context and Components..."

# Auth Context
cat > frontend/src/context/AuthContext.js << 'EOF'
import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userData = authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
          const response = await authService.getMe();
          if (response.success) setUser(response.data);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success) {
      setUser(response.data.user);
      setIsAuthenticated(true);
    }
    return response;
  };

  const register = async (email, password, referralCode) => {
    return await authService.register(email, password, referralCode);
  };

  const verifyEmail = async (email, code) => {
    const response = await authService.verifyEmail(email, code);
    if (response.success) {
      const userData = await authService.getMe();
      if (userData.success) {
        setUser(userData.data);
        setIsAuthenticated(true);
      }
    }
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = { user, loading, isAuthenticated, login, register, verifyEmail, 
logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
EOF

echo "✅ Auth Context created!"
echo ""
echo "Creating components..."
echo "This will take a moment..."
