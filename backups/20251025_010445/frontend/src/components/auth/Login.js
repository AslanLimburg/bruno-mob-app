import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = ({ addNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // 🆕 Состояние для показа пароля
  const [showPassword, setShowPassword] = useState(false);
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

  // 🆕 Функция переключения видимости пароля
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 🆕 ЛОГО */}
        <div className="login-logo">
          <img src="/images/logo.svg" alt="Bruno Token Logo" />
        </div>

        <h1 className="auth-title">Welcome to Bruno Token</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          
          {/* 🆕 ПОЛЕ ПАРОЛЯ С ИКОНКОЙ ПОКАЗА */}
          <div className="password-wrapper">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <span 
              className="password-toggle" 
              onClick={togglePasswordVisibility}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          <Link to="/forgot-password" className="forgot-link">
            Forgot Password?
          </Link>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : "Sign In - Let's Go"}
          </button>

          <button
            type="button"
            onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`}
            className="google-signin-btn"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
        
        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign Up</Link>
          
          {/* 🆕 PRIVACY POLICY LINK */}
          <p className="privacy-link-container">
            <Link to="/privacy-policy" className="link-privacy">
              Privacy Policy & Terms
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;