// src/components/PlayerSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { usePlayer, PLAYER_TYPES } from '../contexts/PlayerContext';

const PlayerSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedPlayer, setPlayer } = usePlayer();
  const dropdownRef = useRef(null);

  const playerOptions = [
    { value: PLAYER_TYPES.PLYR, label: 'Plyr', icon: 'fa-video' },
    { value: PLAYER_TYPES.SHAKA, label: 'Shaka', icon: 'fa-film' },
    { value: PLAYER_TYPES.CLAPPR, label: 'Clappr', icon: 'fa-tv' }
  ];

  const currentPlayer = playerOptions.find(p => p.value === selectedPlayer) || playerOptions[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (playerType) => {
    setPlayer(playerType);
    setIsOpen(false);
    // Reload the page to apply new player
    window.location.reload();
  };

  return (
    <div className="player-selector" ref={dropdownRef}>
      <button 
        className="player-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Select Player"
      >
        <i className={`fas ${currentPlayer.icon}`}></i>
        <span>{currentPlayer.label}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {isOpen && (
        <div className="player-selector-dropdown">
          {playerOptions.map((option) => (
            <button
              key={option.value}
              className={`player-option ${selectedPlayer === option.value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <i className={`fas ${option.icon}`}></i>
              {option.label}
              {selectedPlayer === option.value && (
                <i className="fas fa-check check-icon"></i>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerSelector;
