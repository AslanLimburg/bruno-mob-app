import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const EmailVerification = ({ addNotification }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await verifyEmail(email, code);
      if (response.success) {
        addNotification('success', 'Verified!');
        navigate('/dashboard');
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
        <h1 className="auth-title">Verify Email</h1>
        <p className="auth-subtitle">Code sent to: <strong>{email}</strong></p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="text" 
            placeholder="6-digit code" 
            value={code} 
            onChange={(e) => setCode(e.target.value.slice(0, 6))} 
            maxLength="6" 
            required 
            className="code-input" 
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailVerification;
