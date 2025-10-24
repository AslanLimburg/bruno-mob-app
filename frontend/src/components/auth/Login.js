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
  // 🆕 Состояния для модальных окон
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
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

  // 🆕 Функции для модальных окон
  const handlePrivacyClick = (e) => {
    e.preventDefault();
    setShowPrivacyModal(true);
  };


  const handleStoreClick = (storeName) => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
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
          
          {/* 🆕 PRIVACY POLICY & TERMS LINK */}
          <p className="privacy-link-container">
            <button onClick={handlePrivacyClick} className="link-privacy">
              Privacy Policy & Terms
            </button>
          </p>

          {/* 🆕 APP STORE ICONS */}
          <div className="app-stores">
            <button 
              className="store-btn" 
              onClick={() => handleStoreClick('Google Play')}
              title="Google Play Store"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
            </button>
            
            <button 
              className="store-btn" 
              onClick={() => handleStoreClick('Apple Store')}
              title="Apple App Store"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
              </svg>
            </button>
            
            <button 
              className="store-btn" 
              onClick={() => handleStoreClick('AppGallery')}
              title="Huawei AppGallery"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 PRIVACY POLICY & TERMS MODAL */}
      {showPrivacyModal && (
        <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Privacy Policy & Terms of Service</h2>
              <button onClick={() => setShowPrivacyModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <h3>🔒 Privacy Policy</h3>
              
              <h4>Information We Collect</h4>
              <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes your name, email address, password, and any other information you choose to provide.</p>
              
              <p>We also collect information automatically when you use our services, including your IP address, browser type, device information, and usage patterns. We use cookies and similar technologies to enhance your experience and analyze how you use our services.</p>
              
              <h4>How We Use Your Information</h4>
              <p>We use the information we collect to provide, maintain, and improve our services, process transactions, communicate with you, and ensure the security of our platform. We may also use your information to send you important updates about our services.</p>
              
              <h4>Information Sharing</h4>
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with trusted service providers who assist us in operating our platform, conducting our business, or serving our users.</p>
              
              <h4>Data Security</h4>
              <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.</p>
              
              <h4>Your Rights</h4>
              <p>You have the right to access, update, or delete your personal information. You can also opt out of certain communications from us. To exercise these rights, please contact us at privacy@brunotoken.com</p>
              
              <h3>📋 Terms of Service</h3>
              
              <h4>Acceptance of Terms</h4>
              <p>By accessing and using Bruno Token services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
              
              <h4>Use License</h4>
              <p>Permission is granted to temporarily use Bruno Token services for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials.</p>
              
              <h4>User Responsibilities</h4>
              <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password. You must be at least 18 years old to use our services.</p>
              
              <h4>Prohibited Uses</h4>
              <p>You may not use our services for any unlawful purpose or to solicit others to perform unlawful acts. You may not violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances.</p>
              
              <h4>Disclaimer</h4>
              <p>The materials on Bruno Token are provided on an 'as is' basis. Bruno Token makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
              
              <h4>Limitations</h4>
              <p>In no event shall Bruno Token or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Bruno Token, even if Bruno Token or a Bruno Token authorized representative has been notified orally or in writing of the possibility of such damage.</p>
              
              <h4>Governing Law</h4>
              <p>These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.</p>
              
              <h4>Contact Information</h4>
              <p>If you have any questions about this Privacy Policy or Terms of Service, please contact us at:</p>
              <p>Email: privacy@brunotoken.com<br/>
              Support: support@brunotoken.com<br/>
              Legal: legal@brunotoken.com</p>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 COMING SOON NOTIFICATION */}
      {showComingSoon && (
        <div className="coming-soon-notification">
          <div className="coming-soon-content">
            <span>🚀 Coming Soon!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;