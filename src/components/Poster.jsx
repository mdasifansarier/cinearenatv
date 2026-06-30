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

  // Get quality based on stream or premium status
  const getQuality = () => {
    // If premium is explicitly set to true
    if (movie.premium === true) {
      return 'HD';
    }
    // If quality is explicitly set
    if (movie.quality) {
      return movie.quality;
    }
    // If premium is explicitly set to false or null, return null (no badge)
    if (movie.premium === false || movie.premium === null || movie.premium === undefined) {
      return null;
    }
    // Default to null (no badge)
    return null;
  };

  const quality = getQuality();
  const isHD = quality === 'HD' || quality === 'FHD' || quality === '4K' || quality === '1080p' || quality === '720p';
  const qualityColor = isHD ? '#22c55e' : '#60a5fa';

  // Only show quality badge if quality exists
  const showQualityBadge = quality !== null && quality !== undefined && quality !== '';

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
        {/* Quality Badge - Only show if quality exists */}
        {showQualityBadge && (
          <span className="quality-badge" style={{ backgroundColor: qualityColor }}>
            <i className={`fas ${isHD ? 'fa-hdmi' : 'fa-video'}`}></i>
            {quality}
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
