import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import './Messenger.css';

const Messenger = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem('token');

  // Загрузка контактов
  const loadContacts = async () => {
    try {
      const response = await fetch(`${API_URL}/messenger/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (error) {
      console.error('Load contacts error:', error);
    }
  };

  // Загрузка переписки
  const loadConversation = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/messenger/conversation/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.reverse());
        await fetch(`${API_URL}/messenger/read/${userId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        loadContacts();
      }
    } catch (error) {
      console.error('Load conversation error:', error);
    }
  };

  // Поиск пользователей
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/messenger/search?q=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Search users error:', error);
    }
  };

  // Отправка сообщения
  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact) return;

    try {
      const response = await fetch(`${API_URL}/messenger/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to_user_id: selectedContact.contact_user_id || selectedContact.id,
          message_text: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadConversation(selectedContact.contact_user_id || selectedContact.id);
        loadContacts();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // Выбор контакта
  const selectContact = (contact) => {
    setSelectedContact(contact);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    loadConversation(contact.contact_user_id || contact.id);
  };

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Форматирование времени до удаления
  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiresStr = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
    const expires = new Date(expiresStr);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Функции для работы с файлами
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !selectedContact) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('to_user_id', selectedContact.contact_user_id || selectedContact.id);

    try {
      const response = await fetch(`${API_URL}/messenger/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSelectedFile(null);
        setNewMessage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        loadConversation(selectedContact.contact_user_id || selectedContact.id);
      } else {
        alert('Failed to upload file: ' + data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Добавление эмодзи
  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  // Расширенный набор эмодзи
  const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🦀', '🦞', '🦐', '🐙', '🦑', '🐠', '🐟', '🐡', '🐬', '🦈', '🐳', '🐋'],
    objects: ['💰', '💎', '⚡', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '🎯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣'],
    food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🧇', '🥞', '🧈', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌮', '🌯', '🥙', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯'],
    flags: ['🇺🇸', '🇷🇺', '🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇨🇳', '🇯🇵', '🇰🇷', '🇧🇷', '🇮🇳', '🇨🇦', '🇦🇺', '🇲🇽']
  };

  const allEmojis = Object.values(emojiCategories).flat();
  
  // Добавление в контакты
  const addToContacts = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/messenger/add-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contact_user_id: userId })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Added to contacts!');
        loadContacts();
      }
    } catch (error) {
      console.error('Add contact error:', error);
    }
  };

  // Индикатор печатания
  const handleTyping = (value) => {
    setNewMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Автообновление таймеров каждую секунду
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setMessages(prevMessages => [...prevMessages]);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    loadContacts();
    console.log('🚀 BrunoChat updated with WhatsApp-style interface!');
    console.log('📎 File upload enabled');
    console.log('😀 Emoji picker enabled');
    console.log('⏰ Auto-delete: 20 minutes');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => searchUsers(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <div className="messenger-container">
      <div className="messenger-sidebar">
        <div className="messenger-header">
          <h3>💬 BrunoChat</h3>
          <button 
            className="new-chat-btn"
            onClick={() => setShowSearch(!showSearch)}
          >
            ➕
          </button>
        </div>

        {showSearch && (
          <div className="search-section">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="search-user-item"
                  >
                    <div onClick={() => selectContact(user)} className="search-user-main">
                      <div className="contact-avatar">{user.name[0]}</div>
                      <div className="contact-info">
                        <div className="contact-name">{user.name}</div>
                        <div className="contact-email">{user.email}</div>
                      </div>
                    </div>
                    <button 
                      className="add-contact-btn"
                      onClick={() => addToContacts(user.id)}
                      title="Add to contacts"
                    >
                      ➕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="contacts-list">
          {contacts.length === 0 ? (
            <div className="no-contacts">
              <p>No conversations yet</p>
              <p>Click ➕ to start chatting</p>
            </div>
          ) : (
            contacts.map(contact => (
              <div
                key={contact.id}
                className={`contact-item ${selectedContact?.contact_user_id === contact.contact_user_id ? 'active' : ''}`}
                onClick={() => selectContact(contact)}
              >
                <div className="contact-avatar">{contact.name[0]}</div>
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-last-message">
                    {new Date(contact.last_message_at).toLocaleString()}
                  </div>
                </div>
                {contact.unread_count > 0 && (
                  <div className="unread-badge">{contact.unread_count}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="messenger-main">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info" onClick={() => setShowProfile(!showProfile)} style={{cursor: 'pointer'}}>
                <div className="contact-avatar gradient-avatar">{selectedContact.name[0]}</div>
                <div>
                  <div className="chat-user-name">{selectedContact.name}</div>
                  <div className="chat-user-status">
                    {isTyping ? <span className="typing-indicator">typing...</span> : 'Click to view profile'}
                  </div>
                </div>
              </div>
              <div className="header-actions">
                <button 
                  className="icon-btn"
                  onClick={() => setShowProfile(!showProfile)}
                  title="View profile"
                >
                  👤
                </button>
                <div className="auto-delete-badge">
                  🔥 Auto-delete: 20min
                </div>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet</p>
                  <p>Start a secure conversation! 🔒</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.from_user_id === user.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.message_text}</div>
                      <div className="message-footer">
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                        <span className="message-expires">
                          🔥 {getTimeRemaining(msg.expires_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Profile Sidebar */}
            {showProfile && (
              <div className="profile-sidebar">
                <div className="profile-header">
                  <button className="close-profile-btn" onClick={() => setShowProfile(false)}>✕</button>
                  <h3>Contact Info</h3>
                </div>
                <div className="profile-content">
                  <div className="profile-avatar-large gradient-avatar">
                    {selectedContact.name[0]}
                  </div>
                  <h2 className="profile-name">{selectedContact.name}</h2>
                  <p className="profile-email">{selectedContact.email}</p>
                  
                  <div className="profile-info-section">
                    <div className="profile-info-item">
                      <span className="profile-label">Email</span>
                      <span className="profile-value">{selectedContact.email}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-label">User ID</span>
                      <span className="profile-value">#{selectedContact.contact_user_id || selectedContact.id}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-label">Security</span>
                      <span className="profile-value">🔒 End-to-end encrypted</span>
                    </div>
                  </div>

                  <div className="profile-actions">
                    <button className="profile-action-btn danger">
                      🚫 Block User
                    </button>
                    <button className="profile-action-btn">
                      🗑️ Clear Chat History
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h2>BrunoChat</h2>
            <p className="subtitle">Secure messaging for Bruno Token users</p>
            
            <button className="start-chat-btn" onClick={() => setShowSearch(true)}>
              ➕ Start New Chat
            </button>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📎</div>
                <h4>File Sharing</h4>
                <p>Send images, videos, and documents</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">😀</div>
                <h4>Rich Emojis</h4>
                <p>Express yourself with 200+ emojis</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h4>Auto-Delete</h4>
                <p>Messages vanish after 20 minutes</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h4>Real-time</h4>
                <p>Instant message delivery</p>
              </div>
            </div>
            <p className="security-notice">🛡️ All conversations are private and encrypted</p>
          </div>
        )}

        {/* Форма ввода сообщений - всегда видимая как в WhatsApp */}
        <div className="message-input-container">
          {!selectedContact && (
            <div className="input-hint">
              <span className="hint-icon">👆</span>
              <span className="hint-text">Select a contact or click <strong>➕</strong> to start chatting</span>
            </div>
          )}
          {selectedFile && (
            <div className="file-preview">
              <div className="file-preview-content">
                <span className="file-icon">📎</span>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button 
                  type="button" 
                  className="remove-file-btn"
                  onClick={removeSelectedFile}
                >
                  ✕
                </button>
              </div>
              <button 
                type="button" 
                className="upload-file-btn"
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? '⏳ Uploading...' : '📤 Send File'}
              </button>
            </div>
          )}

          <form className="message-input-form" onSubmit={sendMessage}>
            <div className="input-group">
              <button 
                type="button" 
                className="emoji-btn" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add emoji"
                disabled={!selectedContact}
              >
                😀
              </button>
              <input
                type="text"
                placeholder={selectedContact ? "Type a message..." : "Select a contact to start chatting"}
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
                className="message-input"
                disabled={!selectedContact}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="file-input"
                id="file-input"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                disabled={!selectedContact}
              />
              <label htmlFor="file-input" className={`file-btn ${!selectedContact ? 'disabled' : ''}`} title="Attach file">
                📎
              </label>
              <button 
                type="submit" 
                className="send-btn" 
                title="Send message"
                disabled={!selectedContact || (!newMessage.trim() && !selectedFile)}
              >
                📤
              </button>
            </div>
          </form>

          {showEmojiPicker && (
            <div className="emoji-picker">
              <div className="emoji-picker-header">
                <span>✨ Choose an emoji</span>
                <button 
                  type="button" 
                  className="close-emoji-btn"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="emoji-tabs">
                <button className="emoji-tab active" title="Smileys">😀</button>
                <button className="emoji-tab" title="Gestures">👋</button>
                <button className="emoji-tab" title="Hearts">❤️</button>
                <button className="emoji-tab" title="Animals">🐶</button>
                <button className="emoji-tab" title="Objects">🎁</button>
                <button className="emoji-tab" title="Food">🍕</button>
                <button className="emoji-tab" title="Flags">🇺🇸</button>
              </div>
              <div className="emoji-grid">
                {allEmojis.slice(0, 100).map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="emoji-option"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;
