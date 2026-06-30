// src/components/VideoModal.jsx
import React, { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { useData } from '../contexts/DataContext';
import { showToast } from './Toast';

const VideoModal = ({ isOpen, movie, onClose }) => {
  const { globalData } = useData();
  const [suggestedMovies, setSuggestedMovies] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(movie);
  const [playerKey, setPlayerKey] = useState(0);

  useEffect(() => {
    if (movie) {
      setCurrentMovie(movie);
      setPlayerKey(prev => prev + 1); // Force re-render of VideoPlayer
    }
  }, [movie]);

  // Listen for player changes
  useEffect(() => {
    const handlePlayerChanged = () => {
      setPlayerKey(prev => prev + 1);
    };
    window.addEventListener('playerChanged', handlePlayerChanged);
    return () => {
      window.removeEventListener('playerChanged', handlePlayerChanged);
    };
  }, []);

  useEffect(() => {
    if (currentMovie && globalData) {
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
      
      const currentLink = currentMovie.m3u8 || currentMovie.mpdLink || currentMovie.link;
      const filtered = allMovies.filter(m => 
        (m.m3u8 || m.mpdLink || m.link) !== currentLink
      );
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setSuggestedMovies(shuffled.slice(0, 12));
    }
  }, [currentMovie, globalData]);

  if (!isOpen || !currentMovie) return null;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentMovie.name,
          text: `Watch "${currentMovie.name}" on CineArena!`,
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
    return currentMovie.logo || currentMovie.image || currentMovie.poster || 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
  };

  return (
    <div className={`video-modal ${isOpen ? 'open' : ''}`}>
      <div className="video-modal-header">
        <button className="close-btn" onClick={onClose}>
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <h3 className="video-title">{currentMovie.name || 'Untitled'}</h3>
        <button className="share-btn" onClick={handleShare}>
          <i className="fas fa-share-alt"></i>
        </button>
      </div>

      <div className="video-modal-body">
        <div className="video-container">
          <VideoPlayer key={playerKey} movie={currentMovie} />
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
