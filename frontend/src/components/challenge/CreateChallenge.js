import React, { useState } from 'react';
import axios from 'axios';
import './CreateChallenge.css';

function CreateChallenge() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    payoutMode: 'pool_based',
    creatorPrize: '',
    minStake: '5',
    maxStake: '50',
    allowCreatorParticipation: true,
    visibility: 'public'
  });

  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      setMessage('⚠️ Minimum 2 options required');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        setMessage('⚠️ Please select an image file (PNG, JPG, GIF)');
        return;
      }
      
      // Проверка размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('⚠️ Image size must be less than 5MB');
        return;
      }
      
      setLogo(file);
      
      // Создать превью
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      // Используем FormData для отправки файла
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('options', JSON.stringify(formData.options.filter(opt => opt.trim() !== '')));
      formDataToSend.append('payoutMode', formData.payoutMode);
      formDataToSend.append('minStake', parseFloat(formData.minStake));
      formDataToSend.append('maxStake', parseFloat(formData.maxStake));
      formDataToSend.append('allowCreatorParticipation', formData.allowCreatorParticipation);
      formDataToSend.append('visibility', formData.visibility);

      if (formData.payoutMode === 'fixed_creator_prize') {
        formDataToSend.append('creatorPrize', parseFloat(formData.creatorPrize));
      }

      // Добавляем логотип если есть
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/challenge`,
        formDataToSend,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`
            // НЕ добавляем Content-Type! FormData сделает это автоматически
          } 
        }
      );

      setMessage('✅ Challenge created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        options: ['', ''],
        payoutMode: 'pool_based',
        creatorPrize: '',
        minStake: '5',
        maxStake: '50',
        allowCreatorParticipation: true,
        visibility: 'public'
      });
      setLogo(null);
      setLogoPreview(null);

    } catch (error) {
      setMessage(`❌ ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-challenge">
      <h2>✨ Create New Challenge</h2>
      
      <form onSubmit={handleSubmit} className="challenge-form">
        {/* Title */}
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Bitcoin to $100k by end of 2025?"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide details about your challenge..."
            rows="3"
          />
        </div>

        {/* Logo Upload */}
        <div className="form-group">
          <label>Challenge Logo (Optional)</label>
          
          {!logoPreview ? (
            <div className="logo-upload-container">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="logo-upload" className="upload-button">
                📷 Upload Logo
              </label>
              <p className="upload-hint">PNG, JPG, GIF (Max 5MB)</p>
            </div>
          ) : (
            <div className="logo-preview-container">
              <img src={logoPreview} alt="Logo preview" className="logo-preview" />
              <button 
                type="button" 
                className="remove-logo-btn"
                onClick={handleRemoveLogo}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="form-group">
          <label>Options * (minimum 2)</label>
          {formData.options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
              {formData.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="remove-option-btn"
                >
                  ❌
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} className="add-option-btn">
            ➕ Add Option
          </button>
        </div>

        {/* Payout Mode */}
        <div className="form-group">
          <label>Payout Mode</label>
          <select name="payoutMode" value={formData.payoutMode} onChange={handleInputChange}>
            <option value="pool_based">Pool-Based (winners share the pool)</option>
            <option value="fixed_creator_prize">Fixed Creator Prize</option>
          </select>
        </div>

        {/* Creator Prize (if fixed mode) */}
        {formData.payoutMode === 'fixed_creator_prize' && (
          <div className="form-group">
            <label>Creator Prize (BRT) *</label>
            <input
              type="number"
              name="creatorPrize"
              value={formData.creatorPrize}
              onChange={handleInputChange}
              placeholder="e.g., 100"
              step="0.01"
              min="1"
              required
            />
            <small>This amount will be reserved from your balance</small>
          </div>
        )}

        {/* Min/Max Stake */}
        <div className="form-row">
          <div className="form-group">
            <label>Min Stake (BRT)</label>
            <input
              type="number"
              name="minStake"
              value={formData.minStake}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label>Max Stake (BRT)</label>
            <input
              type="number"
              name="maxStake"
              value={formData.maxStake}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              required
            />
          </div>
        </div>

        {/* Settings */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="allowCreatorParticipation"
              checked={formData.allowCreatorParticipation}
              onChange={handleInputChange}
            />
            Allow me to participate in this challenge
          </label>
        </div>

        <div className="form-group">
          <label>Visibility</label>
          <select name="visibility" value={formData.visibility} onChange={handleInputChange}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : '🚀 Create Challenge'}
        </button>

        {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
      </form>
    </div>
  );
}

export default CreateChallenge;