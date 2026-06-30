// src/pages/MoviesPage.jsx
import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import Poster from '../components/Poster';

const MoviesPage = ({ onMovieClick }) => {
  const { globalData, isLoading, loadData, getMovieCount, error, refreshData } = useData();

  useEffect(() => {
    console.log('🔄 MoviesPage mounted');
    if (globalData.movie.length === 0) {
      loadData();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Loading Movies...</div>
      </div>
    );
  }

  const movieCount = getMovieCount('movie');

  // Check if we have data
  if (!globalData.movie || globalData.movie.length === 0) {
    return (
      <div className="page-container">
        <h2 className="page-title">Movies</h2>
        <div className="empty-state">
          <i className="fas fa-film"></i>
          <p>{error || 'No movies available. Please check your internet connection.'}</p>
          <button 
            className="retry-btn"
            onClick={() => refreshData()}
          >
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Movies</h2>
        <span className="movie-count">{movieCount} movies</span>
        <button 
          className="refresh-btn-small"
          onClick={() => refreshData()}
          title="Refresh movies"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>
      <div className="category-grid">
        {globalData.movie.map((category, index) => (
          <div key={index} className="category-section">
            <h3 className="category-title">{category.name || 'Movies'}</h3>
            <div className="movie-grid">
              {category.movies?.map((movie, idx) => (
                <Poster
                  key={movie.link || movie.m3u8 || movie.mpdLink || idx}
                  movie={movie}
                  onClick={onMovieClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoviesPage;
