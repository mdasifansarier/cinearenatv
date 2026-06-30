import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = ({ onPageChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'home', icon: 'fa-home', label: 'Home' },
    { id: 'movies', icon: 'fa-film', label: 'Movies' },
    { id: 'livetv', icon: 'fa-tv', label: 'Live TV' },
    { id: 'sports', icon: 'fa-futbol', label: 'Sports' }
  ];

  const isActive = (path) => {
    if (path === 'home' && location.pathname === '/') return true;
    return location.pathname === `/${path}`;
  };

  const handleClick = (pageId) => {
    onPageChange(pageId);
    navigate(pageId === 'home' ? '/' : `/${pageId}`);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${isActive(item.id) ? 'active' : ''}`}
          onClick={() => handleClick(item.id)}
        >
          <i className={`fas ${item.icon}`}></i>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;