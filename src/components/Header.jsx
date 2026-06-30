// src/components/Header.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const Header = ({ onMenuToggle, onPageChange }) => {
  const { currentUser, logout, openLogin } = useAuth();
  const { refreshData, isLoading } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuToggle}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="logo">CineArena</div>
      </div>
      <div className="header-right">
        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          title="Refresh data"
        >
          <i className={`fas fa-sync-alt ${isRefreshing || isLoading ? 'fa-spin' : ''}`}></i>
        </button>
        {currentUser ? (
          <div className="user-info">
            <span className="username">
              <i className="fas fa-user-check"></i> {currentUser.username}
            </span>
            <button className="logout-btn" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ) : (
          <button className="login-btn" onClick={openLogin}>
            <i className="fas fa-user-lock"></i> Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;