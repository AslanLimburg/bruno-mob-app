import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import EmailVerification from "./components/auth/EmailVerification";
import Dashboard from "./components/dashboard/Dashboard";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

const Notification = ({ type, message, onClose }) => (
  <div className={`notification notification-${type}`}>
    <span>{message}</span>
    <button onClick={onClose}>×</button>
  </div>
);

function AppContent() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
  };

  return (
    <>
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
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUp addNotification={addNotification} />
            </PublicRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <PublicRoute>
              <EmailVerification addNotification={addNotification} />
            </PublicRoute>
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
