import React, { useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const Sidebar = ({ isOpen, onClose, onPageChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedPlayer, setPlayer, PLAYER_TYPES } = usePlayer();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onPageChange('search', searchQuery);
      onClose();
    }
  };

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <div className={`sidebar ${isOpen ? 'active' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-search">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fas fa-search"></i>
            </form>
          </div>

          <nav className="sidebar-nav">
            <button onClick={() => { onPageChange('home'); onClose(); }}>
              <i className="fas fa-home"></i> Home
            </button>
            <button onClick={() => { onPageChange('movies'); onClose(); }}>
              <i className="fas fa-film"></i> Movies
            </button>
            <button onClick={() => { onPageChange('livetv'); onClose(); }}>
              <i className="fas fa-tv"></i> Live TV
            </button>
            <button onClick={() => { onPageChange('sports'); onClose(); }}>
              <i className="fas fa-futbol"></i> Sports
            </button>
            <button onClick={() => { onPageChange('favorite'); onClose(); }}>
              <i className="fas fa-heart"></i> Favorites
            </button>
          </nav>

          <div className="sidebar-player-settings">
            <h4>Player Settings</h4>
            <div className="player-select">
              <label>Default Player</label>
              <select 
                value={selectedPlayer}
                onChange={(e) => setPlayer(e.target.value)}
              >
                <option value={PLAYER_TYPES.HLS}>HLS.js</option>
                <option value={PLAYER_TYPES.SHAKA}>Shaka Player</option>
                <option value={PLAYER_TYPES.PLYR}>Plyr</option>
                <option value={PLAYER_TYPES.CLAPPR}>Clappr</option>
              </select>
            </div>
          </div>

          <button 
            className="ghost-problem-btn" 
            onClick={() => { /* Open problem modal */ onClose(); }}
          >
            <i className="fas fa-ghost"></i> CineArena Problem Fix
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;