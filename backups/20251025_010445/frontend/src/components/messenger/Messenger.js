import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

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
        // Отмечаем как прочитанное
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
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/messenger/search?query=${encodeURIComponent(query)}`, {
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
    if (!newMessage.trim() || !selectedContact) return;

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

  // Автообновление таймеров каждую секунду
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setMessages(prevMessages => [...prevMessages]);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    loadContacts();
  }, []);

 // Замени на (прокрутка только при НОВОМ сообщении):
const prevMessagesLength = useRef(0);

useEffect(() => {
  if (messages.length > prevMessagesLength.current) {
    scrollToBottom();
  }
  prevMessagesLength.current = messages.length;
}, [messages]);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => searchUsers(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <div className="messenger-container">
      {/* Sidebar - Список контактов */}
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

        {/* Поиск новых контактов */}
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
                    className="search-result-item"
                    onClick={() => selectContact(user)}
                  >
                    <div className="contact-avatar">{user.name[0]}</div>
                    <div className="contact-info">
                      <div className="contact-name">{user.name}</div>
                      <div className="contact-email">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Список контактов */}
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

      {/* Основная область - Чат */}
      <div className="messenger-main">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="contact-avatar">{selectedContact.name[0]}</div>
                <div>
                  <div className="chat-user-name">{selectedContact.name}</div>
                  <div className="chat-user-email">{selectedContact.email}</div>
                </div>
              </div>
              <div className="auto-delete-info">
                🔥 Messages auto-delete in 3 min
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

            <form className="message-input-form" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="message-input"
              />
              <button type="submit" className="send-btn">
                📤
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>💬 BrunoChat</h2>
            <p>Select a contact to start chatting</p>
            <p className="security-notice">🔒 All messages auto-delete after 3 minutes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;