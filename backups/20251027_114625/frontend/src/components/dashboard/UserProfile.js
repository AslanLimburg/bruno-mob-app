import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import axios from 'axios';
import './UserProfile.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserProfile = ({ addNotification }) => {
  const { user, updateUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    city: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
        city: user.city || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/user/profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        updateUser(response.data.data);
        addNotification('success', 'Profile updated successfully!');
        setEditing(false);
      } else {
        addNotification('error', response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      addNotification('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      country: user.country || '',
      city: user.city || ''
    });
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="user-profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h2>👤 User Profile</h2>
          <div className="profile-actions">
            {!editing ? (
              <button 
                onClick={() => setEditing(true)}
                className="edit-button"
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="save-button"
                >
                  {loading ? '⏳ Saving...' : '💾 Save'}
                </button>
                <button 
                  onClick={handleCancel}
                  className="cancel-button"
                >
                  ❌ Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3>📧 Contact Information</h3>
            <div className="form-group">
              <label>Name:</label>
              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <div className="profile-value">{user.name || 'Not set'}</div>
              )}
            </div>

            <div className="form-group">
              <label>Email:</label>
              <div className="profile-value email-value">
                {user.email}
                <span className="email-status">
                  {user.email_verified ? '✅ Verified' : '⚠️ Not verified'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Phone:</label>
              {editing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="profile-value">{user.phone || 'Not set'}</div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h3>🌍 Location</h3>
            <div className="form-group">
              <label>Country:</label>
              {editing ? (
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter country"
                />
              ) : (
                <div className="profile-value">{user.country || 'Not set'}</div>
              )}
            </div>

            <div className="form-group">
              <label>City:</label>
              {editing ? (
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter city"
                />
              ) : (
                <div className="profile-value">{user.city || 'Not set'}</div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h3>🔐 Account Information</h3>
            <div className="account-info">
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">{user.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value role-badge">
                  {user.role === 'super_admin' ? '👑 Super Admin' : '👤 User'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Member since:</span>
                <span className="info-value">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Last login:</span>
                <span className="info-value">
                  {user.last_login ? new Date(user.last_login).toLocaleString('en-US') : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {user.balances && (
            <div className="profile-section">
              <h3>💰 Account Balances</h3>
              <div className="balances-grid">
                {Object.entries(user.balances).map(([currency, balance]) => (
                  <div key={currency} className="balance-item">
                    <span className="currency">{currency}</span>
                    <span className="balance">{balance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
