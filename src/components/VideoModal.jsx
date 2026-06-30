// src/components/VideoModal.jsx
import React, { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { useData } from '../contexts/DataContext';
import { showToast } from './Toast';

const VideoModal = ({ isOpen, movie, onClose }) => {
  const { globalData } = useData();
  const [suggestedMovies, setSuggestedMovies] = useState([]);

  useEffect(() => {
    if (movie && globalData) {
      const allMovies = [];
      ['movie', 'livetv', 'sports'].forEach(type => {
        if (globalData[type]) {
          globalData[type].forEach(cat => {
            if (cat?.movies) {
              allMovies.push(...cat.movies);
            }
          });
        }
      });
      
      const currentLink = movie.m3u8 || movie.mpdLink || movie.link;
      const filtered = allMovies.filter(m => 
        (m.m3u8 || m.mpdLink || m.link) !== currentLink
      );
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setSuggestedMovies(shuffled.slice(0, 12));
    }
  }, [movie, globalData]);

  if (!isOpen || !movie) return null;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: movie.name,
          text: `Watch "${movie.name}" on CineArena!`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('🔗 Share link copied!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleSuggestedClick = (suggestedMovie) => {
    onClose();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('playMovie', { detail: { movie: suggestedMovie } }));
    }, 300);
  };

  const getMovieLogo = () => {
    return movie.logo || movie.image || movie.poster || 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
  };

  return (
    <div className={`video-modal ${isOpen ? 'open' : ''}`}>
      <div className="video-modal-header">
        <button className="close-btn" onClick={onClose}>
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <h3 className="video-title">{movie.name || 'Untitled'}</h3>
        <button className="share-btn" onClick={handleShare}>
          <i className="fas fa-share-alt"></i>
        </button>
      </div>

      <div className="video-modal-body">
        <div className="video-container">
          <VideoPlayer movie={movie} />
        </div>
        <div className="suggested-section">
          <div className="suggested-header">
            <img 
              src={getMovieLogo()} 
              alt="thumbnail" 
              onError={(e) => {
                e.target.src = 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
              }}
            />
            <span>🔥 Watch Next</span>
          </div>
          <div className="suggested-grid">
            {suggestedMovies.slice(0, 8).map((item, index) => (
              <div 
                key={item.m3u8 || item.mpdLink || index}
                className="suggested-item"
                onClick={() => handleSuggestedClick(item)}
              >
                <img 
                  src={item.logo || 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg'} 
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
                  }}
                />
                <div className="suggested-name">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;