import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error) {
      alert('Google authentication failed');
      navigate('/login');
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token', token);
        login(user);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error parsing user data:', err);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [location, navigate, login]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>Processing Google Sign-In...</h2>
      <p>Please wait...</p>
    </div>
  );
};

export default GoogleAuthCallback;
