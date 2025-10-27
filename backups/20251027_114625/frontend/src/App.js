import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { initGA, trackPageView } from './analytics';
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import EmailVerification from "./components/auth/EmailVerification";
import ReferralRegister from "./components/auth/ReferralRegister";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import GoogleAuthCallback from "./components/auth/GoogleAuthCallback";
import Dashboard from "./components/dashboard/Dashboard";
import Referral from "./components/referral/Referral";
import Lottery from "./components/lottery/Lottery";
import SuperAdminPanel from "./components/super-admin/SuperAdminPanel";
import VectorDestiny from "./components/VectorDestiny/VectorDestiny";
import Verification from "./components/verification/Verification"; // 🆕 KYC страница
import InstallPWA from "./components/InstallPWA"; // 📱 PWA Install button
import UpdateNotification from "./components/UpdateNotification"; // 🔄 PWA Update notification
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  
  // Если не авторизован - редирект на login
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  // Если super-admin - редирект на super-admin panel
  if (user && user.role === 'super_admin') {
    return <Navigate to="/super-admin" />;
  }
  
  return children;
};

const SuperAdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  
  // Если не авторизован - редирект на login
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  // Если не super-admin - редирект на dashboard
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  
  // Если авторизован
  if (isAuthenticated) {
    // Super-admin идёт на свою панель
    if (user && user.role === 'super_admin') {
      return <Navigate to="/super-admin" />;
    }
    // Остальные на dashboard
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const Notification = ({ type, message, onClose }) => (
  <div className={`notification notification-${type}`}>
    <span>{message}</span>
    <button onClick={onClose}>×</button>
  </div>
);

function AppContent() {
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  // Инициализация Google Analytics при загрузке
  useEffect(() => {
    initGA();
  }, []);

  // Отслеживание смены страниц
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
  };

  return (
    <>
      {/* PWA Install Button */}
      <InstallPWA />

      {/* PWA Update Notification */}
      <UpdateNotification />

      <div className="notifications-container">
        {notifications.map((n) => (
          <Notification
            key={n.id}
            type={n.type}
            message={n.message}
            onClose={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
          />
        ))}
      </div>

      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route path="/auth/google/success" element={<GoogleAuthCallback />} />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUp addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <EmailVerification addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route
          path="/ref/:code"
          element={
            <PublicRoute>
              <ReferralRegister addNotification={addNotification} />
            </PublicRoute>
          }
        />
        
        {/* SUPER ADMIN PANEL */}
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminPanel addNotification={addNotification} />
            </SuperAdminRoute>
          }
        />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/referral"
          element={
            <ProtectedRoute>
              <Referral addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lottery"
          element={
            <ProtectedRoute>
              <Lottery addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vector-destiny"
          element={
            <ProtectedRoute>
              <VectorDestiny addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        
        {/* 🆕 KYC/AML VERIFICATION PAGE */}
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <Verification addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
