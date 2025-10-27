import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });

      if (response.data.success) {
        alert('✅ Password reset successful! Please login with your new password.');
        navigate('/login');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔐 Reset Password</h1>
        <p className="auth-subtitle">Enter your new password</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            placeholder="New Password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading || !token}
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || !token}
          />

          <button type="submit" disabled={loading || !token}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
