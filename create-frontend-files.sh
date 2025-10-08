#!/bin/bash

echo "🎨 Creating Frontend files..."

# Utils
cat > frontend/src/utils/constants.js << 'EOF'
export const API_BASE_URL = 'http://localhost:5000/api';

export const COMPANY = {
  LEGAL_NAME: 'Bruno Kapital & Investment LLC',
  COPYRIGHT_YEAR: 2022
};

export const SUPPORTED_CRYPTOS = [
  { symbol: 'BRT', name: 'Bruno Token' },
  { symbol: 'BRTC', name: 'Bruno Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'TRX', name: 'Tron' }
];
EOF

# API Service
cat > frontend/src/services/api.js << 'EOF'
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
EOF

# Auth Service
cat > frontend/src/services/authService.js << 'EOF'
import api from './api';

const authService = {
  register: async (email, password, referralCode = null) => {
    const response = await api.post('/auth/register', { email, password, 
referralCode });
    return response.data;
  },

  verifyEmail: async (email, code) => {
    const response = await api.post('/auth/verify-email', { email, code });
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  resendVerification: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword 
});
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => !!localStorage.getItem('token')
};

export default authService;
EOF

echo "✅ Frontend services created!"
