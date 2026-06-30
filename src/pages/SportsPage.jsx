import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import Poster from '../components/Poster';

const SportsPage = ({ onMovieClick }) => {
  const { globalData, isLoading, loadData } = useData();

  useEffect(() => {
    if (!globalData.sports || globalData.sports.length === 0) {
      loadData();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Loading Sports...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="page-title">Sports</h2>
      <div className="category-grid">
        {globalData.sports?.map((category, index) => (
          <div key={index} className="category-section">
            <h3 className="category-title">{category.name || 'Sports'}</h3>
            <div className="movie-grid">
              {category.movies?.map((movie, idx) => (
                <Poster
                  key={movie.m3u8 || movie.mpdLink || idx}
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

export default SportsPage;