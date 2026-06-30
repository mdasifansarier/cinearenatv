// src/pages/MoviesPage.jsx
import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import Poster from '../components/Poster';

const MoviesPage = ({ onMovieClick }) => {
  const { globalData, isLoading, loadData, getMovieCount } = useData();

  useEffect(() => {
    console.log('🔄 MoviesPage mounted, loading data...');
    // Load data if not already loaded
    if (!globalData.movie || globalData.movie.length === 0) {
      loadData();
    }
  }, []);

  useEffect(() => {
    console.log('📊 MoviesPage - Global Data Updated:', globalData);
  }, [globalData]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Loading Movies...</div>
      </div>
    );
  }

  const movieCount = getMovieCount('movie');

  console.log('🎬 Movie Categories:', globalData.movie);
  console.log('🎬 Total Movies:', movieCount);

  if (!globalData.movie || globalData.movie.length === 0) {
    return (
      <div className="page-container">
        <h2 className="page-title">Movies</h2>
        <div className="empty-state">
          <i className="fas fa-film"></i>
          <p>No movies available. Please check your internet connection.</p>
          <button 
            className="retry-btn"
            onClick={() => loadData()}
          >
            Retry
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
