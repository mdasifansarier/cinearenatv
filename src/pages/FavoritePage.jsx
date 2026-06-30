// src/pages/FavoritePage.jsx
import React, { useState, useEffect } from 'react';
import Poster from '../components/Poster';

const FavoritePage = ({ onMovieClick }) => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('cinearena_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  if (favorites.length === 0) {
    return (
      <div className="page-container">
        <h2 className="page-title">Favorites</h2>
        <div className="empty-state">
          <i className="fas fa-heart-broken"></i>
          <p>No favorites yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="page-title">Favorites</h2>
      <div className="movie-grid">
        {favorites.map((movie, index) => (
          <Poster
            key={movie.m3u8 || movie.mpdLink || index}
            movie={movie}
            onClick={onMovieClick}
          />
        ))}
      </div>
    </div>
  );
};

export default FavoritePage;