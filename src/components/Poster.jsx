// src/components/Poster.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const Poster = ({ movie, isFavorite, onFavoriteToggle, onClick }) => {
  const [isLongPress, setIsLongPress] = useState(false);
  const pressTimer = useRef(null);
  const { getLogo } = useData();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, []);

  const handlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      onFavoriteToggle?.(movie);
    }, 700);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = (e) => {
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }
    onClick?.(movie);
  };

  const getDisplayName = () => {
    return movie.name || movie.title || 'Untitled';
  };

  const getImage = () => {
    if (imgError) return 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
    return getLogo(movie);
  };

  const handleImageError = () => {
    setImgError(true);
  };

  // Get stream type badge
  const getStreamType = () => {
    if (movie.mpdLink) return 'DASH';
    if (movie.m3u8) return 'HLS';
    return '';
  };

  return (
    <div 
      className="poster"
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
    >
      <div className="poster-image-wrapper">
        {movie.premium && (
          <span className="premium-badge">
            <i className="fas fa-crown"></i> VIP
          </span>
        )}
        {isFavorite && (
          <span className="fav-heart-badge">
            <i className="fas fa-heart"></i>
          </span>
        )}
        <img 
          src={getImage()} 
          alt={getDisplayName()} 
          className="poster-img"
          loading="lazy"
          onError={handleImageError}
        />
        {getStreamType() && (
          <span className="stream-type-badge">{getStreamType()}</span>
        )}
      </div>
      <p className="poster-name">{getDisplayName()}</p>
    </div>
  );
};

export default Poster;