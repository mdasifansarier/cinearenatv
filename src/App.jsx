import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import LiveTvPage from './pages/LiveTvPage';
import SportsPage from './pages/SportsPage';
import FavoritePage from './pages/FavoritePage';
import VideoModal from './components/VideoModal';
import LoginModal from './components/LoginModal';
import Toast from './components/Toast';
import './styles/globals.css';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePlayMovie = (event) => {
      const { movie } = event.detail;
      if (movie) {
        setCurrentMovie(movie);
        setIsVideoModalOpen(true);
      }
    };

    window.addEventListener('playMovie', handlePlayMovie);
    return () => window.removeEventListener('playMovie', handlePlayMovie);
  }, []);

  const handlePageChange = (page) => {
    setIsSidebarOpen(false);
    navigate(page === 'home' ? '/' : `/${page}`);
  };

  const handleMovieClick = (movie) => {
    if (movie) {
      setCurrentMovie(movie);
      setIsVideoModalOpen(true);
    }
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setTimeout(() => setCurrentMovie(null), 300);
  };

  return (
    <div className="app-container">
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        onPageChange={handlePageChange}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onPageChange={handlePageChange}
      />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage onMovieClick={handleMovieClick} />} />
          <Route path="/movies" element={<MoviesPage onMovieClick={handleMovieClick} />} />
          <Route path="/livetv" element={<LiveTvPage onMovieClick={handleMovieClick} />} />
          <Route path="/sports" element={<SportsPage onMovieClick={handleMovieClick} />} />
          <Route path="/favorite" element={<FavoritePage onMovieClick={handleMovieClick} />} />
        </Routes>
      </main>

      <BottomNav onPageChange={handlePageChange} />

      <VideoModal 
        isOpen={isVideoModalOpen}
        movie={currentMovie}
        onClose={closeVideoModal}
      />

      <LoginModal />
      <Toast />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <PlayerProvider>
            <AppContent />
          </PlayerProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;