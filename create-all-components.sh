#!/bin/bash

echo "🎨 Creating ALL React Components..."

# Login Component
cat > frontend/src/components/auth/Login.js << 'ENDFILE'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = ({ addNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.success) {
        addNotification('success', 'Welcome back!');
        navigate('/dashboard');
      } else {
        addNotification('error', response.message);
      }
    } catch (error) {
      if (error.message.includes('verify')) {
        addNotification('error', 'Please verify your email first');
        navigate('/verify-email', { state: { email } });
      } else {
        addNotification('error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome to Bruno Token</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={(e) => 
setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} 
onChange={(e) => setPassword(e.target.value)} required />
          <Link to="/forgot-password" className="forgot-link">Forgot 
Password?</Link>
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 
"Sign In - Let's Go"}</button>
        </form>
        <div className="auth-footer">Don't have an account? <Link to="/signup">Sign 
Up</Link></div>
      </div>
    </div>
  );
};

export default Login;
ENDFILE

# SignUp Component
cat > frontend/src/components/auth/SignUp.js << 'ENDFILE'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const SignUp = ({ addNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      addNotification('error', 'Password must be 8+ characters');
      return;
    }
    if (password !== confirmPassword) {
      addNotification('error', 'Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      addNotification('error', 'Please agree to Terms of Service');
      return;
    }
    setLoading(true);
    try {
      const response = await register(email, password, referralCode || null);
      if (response.success) {
        addNotification('success', 'Registration successful! Check email for 
code.');
        navigate('/verify-email', { state: { email } });
      } else {
        addNotification('error', response.message);
      }
    } catch (error) {
      addNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={(e) => 
setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (8+ characters)" 
value={password} onChange={(e) => setPassword(e.target.value)} required 
minLength="8" />
          <input type="password" placeholder="Confirm Password" 
value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
required />
          <input type="text" placeholder="Referral Code (optional)" 
value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
          <label className="checkbox-label">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => 
setAgreedToTerms(e.target.checked)} required />
            I agree to Terms of Service
          </label>
          <button type="submit" disabled={loading || !agreedToTerms}>{loading ? 
'Creating...' : 'Create Account'}</button>
        </form>
        <div className="auth-footer">Already have account? <Link to="/login">Sign 
In</Link></div>
      </div>
    </div>
  );
};

export default SignUp;
ENDFILE

# EmailVerification Component
cat > frontend/src/components/auth/EmailVerification.js << 'ENDFILE'
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import './Auth.css';

const EmailVerification = ({ addNotification }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      addNotification('error', 'Email not provided');
      navigate('/login');
    }
  }, [email, navigate, addNotification]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      addNotification('error', 'Enter 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyEmail(email, code);
      if (response.success) {
        addNotification('success', 'Email verified!');
        navigate('/dashboard');
      } else {
        addNotification('error', response.message);
      }
    } catch (error) {
      addNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const response = await authService.resendVerification(email);
      if (response.success) {
        addNotification('success', 'Code sent!');
        setCountdown(60);
      } else {
        addNotification('error', response.message);
      }
    } catch (error) {
      addNotification('error', error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Verify Email</h1>
        <p className="auth-subtitle">Code sent to: <strong>{email}</strong></p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="6-digit code" value={code} onChange={(e) 
=> setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength="6" required 
autoFocus className="code-input" />
          <button type="submit" disabled={loading || code.length !== 6}>{loading ? 
'Verifying...' : 'Verify Email'}</button>
        </form>
        <button onClick={handleResend} disabled={resending || countdown > 0} 
className="link-button">
          {resending ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 
'Resend Code'}
        </button>
      </div>
    </div>
  );
};

export default EmailVerification;
ENDFILE

# Dashboard Component
cat > frontend/src/components/dashboard/Dashboard.js << 'ENDFILE'
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ addNotification }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addNotification('success', 'Logged out successfully');
    navigate('/login');
  };

  const totalBalance = user?.balances ? Object.entries(user.balances).reduce((sum, 
[crypto, amount]) => {
    return sum + amount;
  }, 0) : 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Bruno Token</h1>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
      <div className="dashboard-content">
        <div className="balance-card">
          <h2>Total Balance</h2>
          <div className="balance-amount">${totalBalance.toFixed(2)}</div>
          <p className="balance-subtitle">≈ {totalBalance.toFixed(2)} BRT</p>
        </div>
        <div className="user-info">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Referral Code:</strong> {user?.referralCode}</p>
          {user?.membershipTier && <p><strong>Tier:</strong> 
{user.membershipTier}</p>}
        </div>
        <div className="balances-grid">
          {user?.balances && Object.entries(user.balances).map(([crypto, amount]) 
=> (
            <div key={crypto} className="balance-item">
              <div className="crypto-symbol">{crypto}</div>
              <div className="crypto-amount">{amount.toFixed(8)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
ENDFILE

# CSS File
cat > frontend/src/components/auth/Auth.css << 'ENDFILE'
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0A1929 0%, #1A2332 100%);
  padding: 20px;
}

.auth-card {
  background: #1A2332;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.auth-title {
  color: #FFA726;
  font-size: 32px;
  font-weight: 300;
  text-align: center;
  margin-bottom: 30px;
}

.auth-subtitle {
  color: #94A3B8;
  text-align: center;
  margin-bottom: 20px;
}

.auth-subtitle strong {
  color: #FFA726;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.auth-form input {
  padding: 14px 16px;
  background: #0A1929;
  border: 2px solid #1A2332;
  border-radius: 8px;
  color: #FFF;
  font-size: 16px;
  transition: border 0.3s;
}

.auth-form input:focus {
  outline: none;
  border-color: #FFA726;
}

.code-input {
  font-family: monospace;
  font-size: 24px;
  letter-spacing: 8px;
  text-align: center;
}

.auth-form button {
  padding: 14px;
  background: linear-gradient(135deg, #FFA726 0%, #FFB84D 100%);
  border: none;
  border-radius: 8px;
  color: #0A1929;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.3s;
}

.auth-form button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.auth-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.forgot-link {
  text-align: right;
  color: #94A3B8;
  font-size: 14px;
  margin-top: -5px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94A3B8;
  font-size: 14px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  color: #94A3B8;
  font-size: 14px;
}

.auth-footer a {
  color: #FFA726;
  font-weight: 500;
}

.link-button {
  background: none;
  border: none;
  color: #FFA726;
  cursor: pointer;
  margin-top: 15px;
  display: block;
  width: 100%;
  text-align: center;
}

.link-button:disabled {
  color: #64748B;
  cursor: not-allowed;
}
ENDFILE

# Dashboard CSS
cat > frontend/src/components/dashboard/Dashboard.css << 'ENDFILE'
.dashboard-container {
  min-height: 100vh;
  background: #0A1929;
  color: #FFF;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: #1A2332;
}

.dashboard-header h1 {
  color: #FFA726;
  font-weight: 300;
}

.btn-logout {
  padding: 10px 20px;
  background: #FF1744;
  border: none;
  border-radius: 8px;
  color: #FFF;
  cursor: pointer;
}

.dashboard-content {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.balance-card {
  background: linear-gradient(135deg, #1A2332 0%, #2A3342 100%);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  margin-bottom: 30px;
}

.balance-amount {
  font-size: 48px;
  color: #FFA726;
  font-weight: 300;
  margin: 20px 0;
}

.balance-subtitle {
  color: #94A3B8;
  font-size: 18px;
}

.user-info {
  background: #1A2332;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 30px;
}

.user-info p {
  margin: 10px 0;
  color: #94A3B8;
}

.balances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.balance-item {
  background: #1A2332;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.crypto-symbol {
  color: #FFA726;
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 10px;
}

.crypto-amount {
  color: #FFF;
  font-size: 18px;
  font-family: monospace;
}
ENDFILE

echo "✅ All components created!"
