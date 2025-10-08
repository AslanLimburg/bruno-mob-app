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
