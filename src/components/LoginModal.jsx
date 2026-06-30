import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from './Toast';

const LoginModal = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isLoginOpen, closeLogin } = useAuth();

  if (!isLoginOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields!');
      return;
    }

    setIsLoading(true);
    setError('');
    const success = await login(username, password);
    setIsLoading(false);

    if (!success) {
      setError('Invalid username or password!');
    }
  };

  return (
    <div className="login-modal-overlay" style={{ display: 'flex' }}>
      <div className="login-modal">
        <button className="close-btn" onClick={closeLogin}>✕</button>
        
        <h2 className="login-title">
          <i className="fas fa-user-shield"></i> Account Login
        </h2>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <div className="login-actions">
            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p>🔥 Subscribe for 99৳ • Inbox us</p>
          <div className="social-links">
            <a href="https://wa.me/qr/L3CV4ZSUM2MPH1" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp"></i>
              <span>WhatsApp</span>
            </a>
            <a href="https://discord.gg/hkPHyD8JK6" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-discord"></i>
              <span>Discord</span>
            </a>
            <a href="tel:01907293620">
              <i className="fas fa-phone-alt"></i>
              <span>Call Now</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;