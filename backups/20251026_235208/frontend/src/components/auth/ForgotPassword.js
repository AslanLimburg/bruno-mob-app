import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      
      if (response.data.success) {
        setMessage('If this email exists, we sent a reset link. Check your inbox!');
        setEmail('');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔑 Forgot Password</h1>
        <p className="auth-subtitle">Enter your email to receive a password reset link</p>

        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
