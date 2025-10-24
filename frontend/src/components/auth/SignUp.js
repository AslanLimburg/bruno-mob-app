import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const SignUp = ({ addNotification }) => {
  const [name, setName] = useState('');
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
    
    if (!name.trim()) {
      addNotification('error', 'Name is required');
      return;
    }
    
    if (password.length < 8) {
      addNotification('error', 'Password must be 8+ characters');
      return;
    }
    
    if (password !== confirmPassword) {
      addNotification('error', 'Passwords do not match');
      return;
    }
    
    if (!agreedToTerms) {
      addNotification('error', 'Please agree to Terms');
      return;
    }
    
    setLoading(true);
    try {
      const response = await register(email, password, name, referralCode || null);
      if (response.success) {
        addNotification('success', 'Check email for verification code!');
        navigate('/verify-email', { state: { email } });
      } else {
        addNotification('error', response.message);
      }
    } catch (error) {
      addNotification('error', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password (min 8 characters)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            minLength="8" 
          />
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Referral Code (optional)" 
            value={referralCode} 
            onChange={(e) => setReferralCode(e.target.value)} 
          />
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={agreedToTerms} 
              onChange={(e) => setAgreedToTerms(e.target.checked)} 
              required 
            />
            I agree to Terms of Service 18+
          </label>
          <button type="submit" disabled={loading || !agreedToTerms}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
