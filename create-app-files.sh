#!/bin/bash

echo "🎨 Creating App.js and global styles..."

# App.js
cat > frontend/src/App.js << 'ENDFILE'
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 
'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './components/dashboard/Dashboard';
import './App.css';

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
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 
5000);
  };

  return (
    <>
      <div className="notifications-container">
        {notifications.map(n => (
          <Notification key={n.id} type={n.type} message={n.message} onClose={() => 
setNotifications(prev => prev.filter(x => x.id !== n.id))} />
        ))}
      </div>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login 
addNotification={addNotification} /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp 
addNotification={addNotification} /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><EmailVerification 
addNotification={addNotification} /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard 
addNotification={addNotification} /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
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
ENDFILE

# App.css
cat > frontend/src/App.css << 'ENDFILE'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Exo 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0A1929;
  color: #FFF;
  font-weight: 300;
}

.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0A1929;
  color: #FFA726;
  font-size: 24px;
}

.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  min-width: 300px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

.notification-success {
  background: rgba(0, 255, 65, 0.1);
  border: 2px solid #00FF41;
  color: #00FF41;
}

.notification-error {
  background: rgba(255, 23, 68, 0.1);
  border: 2px solid #FF1744;
  color: #FF1744;
}

.notification button {
  background: none;
  border: none;
  color: inherit;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
ENDFILE

# index.css
cat > frontend/src/index.css << 'ENDFILE'
@import 
url('https://fonts.googleapis.com/css2?family=Exo+2:wght@200;300;400;500&display=swap');

body {
  margin: 0;
  font-family: 'Exo 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #0A1929;
  color: #FFFFFF;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #0A1929;
}

::-webkit-scrollbar-thumb {
  background: #1A2332;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #FFA726;
}
ENDFILE

echo "✅ App files created!"
