import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import Poster from '../components/Poster';

const HomePage = ({ onMovieClick }) => {
  const { globalData, isLoading, loadData } = useData();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const sliderItems = [
    {
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200',
      title: 'Watch All Latest Movies',
      badge: 'Movies',
      link: '/movies'
    },
    {
      image: 'https://images.unsplash.com/photo-1593789198777-f29bc259780e?q=80&w=1200',
      title: 'Live TV Channels',
      badge: 'Live TV',
      link: '/livetv'
    },
    {
      image: 'https://images.unsplash.com/photo-1461896836934-b6a51abde0a4?q=80&w=1200',
      title: 'Live Sports Action',
      badge: 'Sports',
      link: '/sports'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  const renderMovieRow = (title, data, seeAllLink) => {
    if (!data || data.length === 0) return null;
    const allMovies = data.flatMap(cat => cat.movies || []);
    if (allMovies.length === 0) return null;

    return (
      <div className="movie-row">
        <div className="movie-row-header">
          <h2 className="movie-row-title">{title}</h2>
          {seeAllLink && (
            <button className="see-all-btn" onClick={() => navigate(seeAllLink)}>
              SEE ALL <i className="fas fa-arrow-right"></i>
            </button>
          )}
        </div>
        <div className="scroll-row">
          {allMovies.slice(0, 15).map((movie, index) => (
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

  return (
    <div className="home-page">
      <div className="slider-container">
        {sliderItems.map((item, index) => (
          <div 
            key={index} 
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            onClick={() => navigate(item.link)}
          >
            <img src={item.image} alt={item.title} className="slide-image" />
            <div className="slide-overlay">
              <div className="slide-content">
                <span className="badge red">{item.badge}</span>
                <h2>{item.title}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="home-content">
        {renderMovieRow('Movies', globalData.movie, '/movies')}
        {renderMovieRow('Live TV', globalData.livetv, '/livetv')}
        {renderMovieRow('Sports', globalData.sports, '/sports')}
      </div>
    </div>
  );
};

export default HomePage;