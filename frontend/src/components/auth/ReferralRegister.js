import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './Auth.css';

const ReferralRegister = () => {
  const { code } = useParams(); // Get referral code from URL
  const location = useLocation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState('');

  useEffect(() => {
    // Parse query params to get program
    const params = new URLSearchParams(location.search);
    const programParam = params.get('program');
    if (programParam) {
      setProgram(programParam);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password || !formData.name) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Register user
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Show success and redirect to Club Avalanche with referral info
        alert(`Welcome ${formData.name}! You've been referred by ${code} to ${program || 'Club Avalanche'}`);
        
        // Redirect to dashboard with a flag to auto-open Club Avalanche
        navigate('/dashboard', { 
          state: { 
            openClubAvalanche: true, 
            referralCode: code,
            program: program 
          } 
        });
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎯 Join Bruno Kapital</h1>
          <p className="referral-info">
            You've been invited with code: <strong>{code}</strong>
            {program && <><br/>Program: <strong>{program}</strong></>}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account & Join'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
};

export default ReferralRegister;
