// =====================================================
// BRT STARS CHALLENGE - PROFILE COMPONENT
// frontend/src/components/stars-challenge/StarsProfile.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const StarsProfile = ({ user }) => {
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMainPhoto, setIsMainPhoto] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadUserPhotos();
    loadUserStats();
  }, []);
  
  const loadUserPhotos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/photo/user/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setPhotos(response.data.photos || []);
      setLoading(false);
    } catch (err) {
      console.error('Load photos error:', err);
      setLoading(false);
    }
  };
  
  const loadUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/stats`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setStats(response.data.stats);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверить размер (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setMessage('File too large. Max 10MB.');
        return;
      }
      
      // Проверить тип
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setMessage('Invalid file type. Only JPEG, PNG, WebP allowed.');
        return;
      }
      
      setSelectedFile(file);
      setMessage('');
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first');
      return;
    }
    
    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('isMainPhoto', isMainPhoto);
      
      const response = await axios.post(
        `${API_URL}/stars/photo/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setMessage(response.data.message);
      setSelectedFile(null);
      setIsMainPhoto(false);
      
      // Обновить список фото
      loadUserPhotos();
      loadUserStats();
      
      // Очистить input
      document.getElementById('photoInput').value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  const handleRenewPhoto = async (photoId) => {
    if (!window.confirm('Renew this photo for 1 year? (Cost: 1 BRT)')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/stars/photo/${photoId}/renew`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setMessage(response.data.message);
      loadUserPhotos();
      
    } catch (err) {
      console.error('Renew error:', err);
      setMessage(err.response?.data?.error || 'Renew failed');
    }
  };
  
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/stars/photo/${photoId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setMessage(response.data.message);
      loadUserPhotos();
      
    } catch (err) {
      console.error('Delete error:', err);
      setMessage(err.response?.data?.error || 'Delete failed');
    }
  };
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }
  
  const mainPhoto = photos.find(p => p.is_main_photo);
  const additionalPhotos = photos.filter(p => !p.is_main_photo);
  
  return (
    <div className="stars-profile">
      {/* Statistics */}
      <div className="profile-stats-section">
        <h2>📊 Your Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-number">{stats?.received?.total_stars_received || 0}</span>
              <span className="stat-label">Total Stars Received</span>
            </div>
          </div>
          
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <span className="stat-number">{parseFloat(stats?.received?.total_brt_earned || 0).toFixed(2)}</span>
              <span className="stat-label">BRT Earned</span>
            </div>
          </div>
          
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-content">
              <span className="stat-number">{stats?.received?.unique_voters || 0}</span>
              <span className="stat-label">Unique Voters</span>
            </div>
          </div>
          
          <div className="stat-card">
            <span className="stat-icon">🗓</span>
            <div className="stat-content">
              <span className="stat-number">{stats?.periods?.week_stars || 0}</span>
              <span className="stat-label">Stars This Week</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upload Section */}
      <div className="upload-section">
        <h2>📤 Upload Photo</h2>
        
        <div className="upload-info">
          <p>🆓 <strong>Main photo is FREE</strong> (can change once per week)</p>
          <p>💎 Additional photos cost <strong>1 BRT each</strong></p>
          <p>📅 Photos stay active for <strong>365 days</strong></p>
        </div>
        
        <div className="upload-form">
          <input 
            type="file" 
            id="photoInput"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={isMainPhoto}
              onChange={(e) => setIsMainPhoto(e.target.checked)}
              disabled={uploading || !selectedFile}
            />
            <span>Set as main photo (FREE)</span>
          </label>
          
          <button 
            className="upload-button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Uploading...' : (isMainPhoto ? 'Upload Main Photo (FREE)' : 'Upload Photo (1 BRT)')}
          </button>
          
          {selectedFile && (
            <p className="selected-file">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        
        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}
      </div>
      
      {/* Main Photo */}
      {mainPhoto && (
        <div className="main-photo-section">
          <h2>🌟 Main Photo</h2>
          <div className="photo-card main">
            <div className="photo-wrapper">
              <img src={mainPhoto.photo_url} alt="Main" />
              
              {mainPhoto.is_expiring_soon && (
                <div className="expiring-badge blinking">
                  🔴 Expiring Soon
                </div>
              )}
            </div>
            
            <div className="photo-info">
              <div className="photo-stats">
                <span className="stars-count">⭐ {mainPhoto.total_stars || 0} Stars</span>
                <span className="upload-date">
                  Uploaded: {new Date(mainPhoto.upload_date).toLocaleDateString()}
                </span>
                <span className="expires-date">
                  Expires: {new Date(mainPhoto.expires_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="photo-actions">
                {mainPhoto.is_expiring_soon && (
                  <button 
                    className="renew-button"
                    onClick={() => handleRenewPhoto(mainPhoto.id)}
                  >
                    🔄 Renew (1 BRT)
                  </button>
                )}
                <button 
                  className="delete-button"
                  onClick={() => handleDeletePhoto(mainPhoto.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Additional Photos */}
      {additionalPhotos.length > 0 && (
        <div className="additional-photos-section">
          <h2>📸 Additional Photos ({additionalPhotos.length})</h2>
          <div className="photos-grid">
            {additionalPhotos.map(photo => (
              <div key={photo.id} className="photo-card">
                <div className="photo-wrapper">
                  <img src={photo.photo_url} alt={`Photo ${photo.id}`} />
                  
                  {photo.is_expiring_soon && (
                    <div className="expiring-badge blinking">
                      🔴 Expiring
                    </div>
                  )}
                </div>
                
                <div className="photo-info">
                  <div className="photo-stats-mini">
                    <span>⭐ {photo.total_stars || 0}</span>
                    <span>{new Date(photo.upload_date).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="photo-actions-mini">
                    {photo.is_expiring_soon && (
                      <button 
                        className="action-btn renew"
                        onClick={() => handleRenewPhoto(photo.id)}
                      >
                        🔄
                      </button>
                    )}
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeletePhoto(photo.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {photos.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📷</span>
          <p>No photos yet</p>
          <p className="empty-subtitle">Upload your first photo to get started!</p>
        </div>
      )}
    </div>
  );
};

export default StarsProfile;