import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            setUser(response.data.data);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Load user error:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const register = async (email, password, name, referralCode = null) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
        referralCode
      });
      
      if (response.data.success) {
        return { 
          success: true, 
          message: response.data.message,
          data: response.data.data
        };
      } else {
        return { 
          success: false, 
          message: response.data.message 
        };
      }
    } catch (error) {
      console.error("Register error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Registration failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem("token", token);
        setUser(user);
        setIsAuthenticated(true);
        return { success: true, message: response.data.message };
      } else {
        return { 
          success: false, 
          message: response.data.message,
          requiresVerification: response.data.requiresVerification
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed",
        requiresVerification: error.response?.data?.requiresVerification
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/verify-email`, {
        email,
        code
      });

      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem("token", token);
        
        // Load user data after verification
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userResponse.data.success) {
          setUser(userResponse.data.data);
          setIsAuthenticated(true);
        }
        
        return { success: true, message: response.data.message };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error("Verify email error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Verification failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email
      });
      return { 
        success: response.data.success, 
        message: response.data.message 
      };
    } catch (error) {
      console.error("Resend verification error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Failed to resend code" 
      };
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Обновить данные пользователя из API
  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUser(response.data.data);
        console.log('✅ User data refreshed:', response.data.data.email, response.data.data.balances);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAuthenticated, 
        login, 
        logout, 
        register, 
        verifyEmail,
        resendVerification,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};