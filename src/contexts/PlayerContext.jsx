// src/contexts/PlayerContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PlayerContext = createContext();

export const PLAYER_TYPES = {
  SHAKA: 'shaka',
  PLYR: 'plyr',
  CLAPPR: 'clappr'
};

export const PlayerProvider = ({ children }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(() => {
    const saved = localStorage.getItem('cinearena_selected_player');
    return saved || PLAYER_TYPES.PLYR;
  });

  useEffect(() => {
    localStorage.setItem('cinearena_selected_player', selectedPlayer);
  }, [selectedPlayer]);

  const setPlayer = useCallback((playerType) => {
    if (Object.values(PLAYER_TYPES).includes(playerType)) {
      setSelectedPlayer(playerType);
    }
  }, []);

  const getPlayer = useCallback(() => selectedPlayer, [selectedPlayer]);

  return (
    <PlayerContext.Provider value={{
      selectedPlayer,
      setPlayer,
      getPlayer,
      PLAYER_TYPES
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};