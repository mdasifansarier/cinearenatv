// src/contexts/DataContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DataContext = createContext();

// External JSON URLs - Replace with your actual URLs
const DATA_URLS = {
  movies: 'https://raw.githubusercontent.com/ghosttv620/Ghost-Movie/main/Ghost%20Movie.json',
  livetv: 'https://cinearenatv.vercel.app/data/livtv.json',
  sports: 'https://cinearenatv.vercel.app/data/sports.json'
};

// Fallback data for each category
const FALLBACK_DATA = {
  movie: [],
  livetv: [
    {
      name: "Live TV",
      movies: [
        { 
          name: "Sample Live TV", 
          m3u8: "https://example.com/sample.m3u8", 
          type: "hls",
          premium: false,
          logo: "https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg"
        }
      ]
    }
  ],
  sports: [
    {
      name: "Sports",
      movies: [
        { 
          name: "Sample Sports", 
          m3u8: "https://example.com/sample.m3u8", 
          type: "hls",
          premium: false,
          logo: "https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg"
        }
      ]
    }
  ],
  adult: []
};

export const DataProvider = ({ children }) => {
  const [globalData, setGlobalData] = useState({
    movie: [],
    livetv: [],
    sports: [],
    adult: []
  });
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load favorites from localStorage
  const loadFavorites = useCallback(() => {
    const saved = localStorage.getItem('cinearena_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem('cinearena_favorites', JSON.stringify(newFavorites));
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((movie) => {
    const movieId = movie.m3u8 || movie.mpdLink || movie.link || movie.id;
    const exists = favorites.some(f => (f.m3u8 || f.mpdLink || f.link || f.id) === movieId);
    let newFavorites;
    if (exists) {
      newFavorites = favorites.filter(f => (f.m3u8 || f.mpdLink || f.link || f.id) !== movieId);
    } else {
      newFavorites = [...favorites, movie];
    }
    saveFavorites(newFavorites);
    return !exists;
  }, [favorites, saveFavorites]);

  // Check if movie is favorite
  const isFavorite = useCallback((movie) => {
    const movieId = movie.m3u8 || movie.mpdLink || movie.link || movie.id;
    return favorites.some(f => (f.m3u8 || f.mpdLink || f.link || f.id) === movieId);
  }, [favorites]);

  // Get logo with fallback
  const getLogo = useCallback((movie) => {
    if (movie.logo) return movie.logo;
    if (movie.image) return movie.image;
    if (movie.poster) return movie.poster;
    return 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg';
  }, []);

  // Fetch data from external JSON
  const fetchData = useCallback(async (url, type) => {
    try {
      console.log(`Fetching ${type} data from:`, url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`${type} data fetched:`, data);

      // Handle the data format - expects { categories: [...] }
      let categories = [];
      
      if (data && data.categories) {
        categories = data.categories;
      } else if (Array.isArray(data)) {
        categories = data;
      } else if (data && typeof data === 'object') {
        // Try to find categories array in the object
        const keys = Object.keys(data);
        for (const key of keys) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            if (data[key][0].movies || data[key][0].name) {
              categories = data[key];
              break;
            }
          }
        }
      }

      // Ensure each movie has proper fields
      categories = categories.map(category => ({
        ...category,
        movies: (category.movies || []).map(movie => ({
          ...movie,
          // Map link to appropriate field for video player
          link: movie.link || movie.m3u8 || movie.mpdLink || '',
          logo: movie.logo || movie.image || movie.poster || 'https://image.tmdb.org/t/p/original//1CTw5gGz4GrWyCYjPBuf2VdjTsv.jpg',
          // Keep original fields for compatibility
          m3u8: movie.m3u8 || '',
          mpdLink: movie.mpdLink || '',
          premium: movie.premium !== undefined ? movie.premium : null,
          quality: movie.quality || (movie.premium === true ? 'HD' : movie.premium === false ? 'SD' : null),
          // If hidden is true, skip this movie (for hidden channels)
          hidden: movie.hidden || false
        })).filter(movie => !movie.hidden) // Filter out hidden movies
      }));

      return categories;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Fetch timeout for ${type}:`, error);
      } else {
        console.error(`Error fetching ${type}:`, error);
      }
      return FALLBACK_DATA[type] || [];
    }
  }, []);

  // Load all data
  const loadData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first (5 minute cache)
      const cacheKey = 'cinearena_all_data_cache';
      const cacheTimeKey = 'cinearena_all_data_cache_time';
      
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        
        if (cached && cacheTime) {
          const elapsed = Date.now() - parseInt(cacheTime);
          if (elapsed < 5 * 60 * 1000) { // 5 minutes
            try {
              const parsed = JSON.parse(cached);
              setGlobalData(parsed);
              loadFavorites();
              setIsLoading(false);
              return;
            } catch (e) {
              // Cache parsing failed, continue to fetch
            }
          }
        }
      }

      // Fetch all data in parallel
      const [movieData, livetvData, sportsData] = await Promise.all([
        fetchData(DATA_URLS.movies, 'movie'),
        fetchData(DATA_URLS.livetv, 'livetv'),
        fetchData(DATA_URLS.sports, 'sports')
      ]);

      const newData = {
        movie: movieData.length > 0 ? movieData : FALLBACK_DATA.movie,
        livetv: livetvData.length > 0 ? livetvData : FALLBACK_DATA.livetv,
        sports: sportsData.length > 0 ? sportsData : FALLBACK_DATA.sports,
        adult: []
      };

      setGlobalData(newData);
      
      // Cache data
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newData));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch (e) {
        // Cache storage failed
      }

      loadFavorites();
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
      
      // Use fallback data
      setGlobalData({
        movie: FALLBACK_DATA.movie,
        livetv: FALLBACK_DATA.livetv,
        sports: FALLBACK_DATA.sports,
        adult: []
      });
      loadFavorites();
      setIsLoading(false);
    }
  }, [fetchData, loadFavorites]);

  // Refresh data manually
  const refreshData = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  // Auto-load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get all movies across all categories
  const getAllMovies = useCallback(() => {
    const all = [];
    ['movie', 'livetv', 'sports', 'adult'].forEach(type => {
      if (globalData[type]) {
        globalData[type].forEach(category => {
          if (category?.movies) {
            all.push(...category.movies.map(m => ({ ...m, category: category.name, type })));
          }
        });
      }
    });
    return all;
  }, [globalData]);

  // Search movies
  const searchMovies = useCallback((query) => {
    if (!query || query.trim() === '') return [];
    const all = getAllMovies();
    const lowerQuery = query.toLowerCase().trim();
    return all.filter(movie => 
      movie.name?.toLowerCase().includes(lowerQuery) ||
      movie.category?.toLowerCase().includes(lowerQuery)
    );
  }, [getAllMovies]);

  // Get movies by category
  const getMoviesByCategory = useCallback((category, type) => {
    const data = globalData[type];
    if (!data) return [];
    const found = data.find(cat => cat.name === category || cat.id === category);
    return found?.movies || [];
  }, [globalData]);

  // Get count of movies in a category
  const getMovieCount = useCallback((type = 'all') => {
    let count = 0;
    if (type === 'all') {
      ['movie', 'livetv', 'sports'].forEach(t => {
        if (globalData[t]) {
          globalData[t].forEach(category => {
            if (category?.movies) {
              count += category.movies.length;
            }
          });
        }
      });
    } else if (globalData[type]) {
      globalData[type].forEach(category => {
        if (category?.movies) {
          count += category.movies.length;
        }
      });
    }
    return count;
  }, [globalData]);

  return (
    <DataContext.Provider value={{
      globalData,
      isLoading,
      error,
      favorites,
      toggleFavorite,
      isFavorite,
      loadData,
      refreshData,
      getAllMovies,
      searchMovies,
      getMoviesByCategory,
      getLogo,
      getMovieCount,
      DATA_URLS
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
