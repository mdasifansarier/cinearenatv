// src/components/VideoPlayer.jsx
import React, { useEffect, useState, useRef } from 'react';
import { usePlayer, PLAYER_TYPES } from '../contexts/PlayerContext';
import PlayerSelector from './PlayerSelector';
import { showToast } from './Toast';

const VideoPlayer = ({ movie }) => {
  const { selectedPlayer } = usePlayer();
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getSource = () => {
    if (movie?.m3u8) return { url: movie.m3u8, type: 'hls' };
    if (movie?.mpdLink) return { url: movie.mpdLink, type: 'mpd' };
    if (movie?.link) return { url: movie.link, type: 'hls' };
    return null;
  };

  const source = getSource();

  useEffect(() => {
    if (!movie || !containerRef.current || !source) {
      setIsLoading(false);
      return;
    }

    // Clean up any existing player
    const cleanup = () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          } else if (typeof playerRef.current.dispose === 'function') {
            playerRef.current.dispose();
          }
        } catch (e) {}
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoading(true);
      setPlayerError(null);
      setIsReady(false);
    };

    cleanup();

    // Simple video player - most reliable
    const createSimplePlayer = () => {
      try {
        const videoEl = document.createElement('video');
        videoEl.className = 'w-full h-full';
        videoEl.setAttribute('controls', 'true');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.setAttribute('preload', 'auto');
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'contain';
        videoEl.style.backgroundColor = '#000';
        
        // Set source
        videoEl.src = source.url;
        
        // Handle events
        videoEl.addEventListener('loadedmetadata', () => {
          if (isMounted.current) {
            setIsLoading(false);
            setIsReady(true);
          }
        });

        videoEl.addEventListener('error', (e) => {
          console.error('Video error:', e);
          if (isMounted.current) {
            setPlayerError('Failed to load video');
            setIsLoading(false);
          }
        });

        videoEl.addEventListener('canplay', () => {
          if (isMounted.current) {
            setIsLoading(false);
            setIsReady(true);
          }
        });

        containerRef.current.appendChild(videoEl);
        playerRef.current = videoEl;

        // Try to play
        videoEl.play().catch(() => {
          // Autoplay blocked, user will click play
          if (isMounted.current) {
            setIsLoading(false);
          }
        });

      } catch (error) {
        console.error('Simple player error:', error);
        if (isMounted.current) {
          setPlayerError('Failed to create video player');
          setIsLoading(false);
        }
      }
    };

    // Try HLS.js for HLS streams
    const createHlsPlayer = async () => {
      try {
        // Load HLS.js dynamically
        let Hls;
        try {
          const hlsModule = await import('hls.js');
          Hls = hlsModule.default || hlsModule;
        } catch (e) {
          // If import fails, try CDN
          await loadScript('https://cdn.jsdelivr.net/npm/hls.js@0.14.17/dist/hls.min.js');
          Hls = window.Hls;
        }

        if (!Hls || !Hls.isSupported()) {
          createSimplePlayer();
          return;
        }

        const videoEl = document.createElement('video');
        videoEl.className = 'w-full h-full';
        videoEl.setAttribute('controls', 'true');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.setAttribute('preload', 'auto');
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'contain';
        videoEl.style.backgroundColor = '#000';
        containerRef.current.appendChild(videoEl);

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxMaxBufferLength: 100,
        });

        hls.loadSource(source.url);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isMounted.current) {
            setIsLoading(false);
            setIsReady(true);
          }
          videoEl.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data);
            // Fallback to simple player
            cleanup();
            createSimplePlayer();
          }
        });

        playerRef.current = { hls, videoEl };

      } catch (error) {
        console.error('HLS player error:', error);
        // Fallback to simple player
        cleanup();
        createSimplePlayer();
      }
    };

    // Load script helper
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    // Choose player based on type
    const initializePlayer = async () => {
      if (source.type === 'hls') {
        await createHlsPlayer();
      } else {
        createSimplePlayer();
      }
    };

    initializePlayer();

    return () => {
      if (playerRef.current) {
        try {
          if (playerRef.current.hls) {
            playerRef.current.hls.destroy();
          }
        } catch (e) {}
      }
      cleanup();
    };
  }, [movie, source]);

  return (
    <div className="video-player-wrapper">
      <PlayerSelector />
      {source && isReady && (
        <div className="player-stream-info">
          <span className="stream-type">{source.type.toUpperCase()}</span>
          <span className="player-status">● Live</span>
        </div>
      )}
      {isLoading && (
        <div className="player-loading-overlay" style={{ display: 'flex' }}>
          <div className="player-loading-spinner"></div>
          <span>Loading video...</span>
        </div>
      )}
      {playerError && (
        <div className="player-error-container">
          <div className="player-error-icon">⚠️</div>
          <div className="player-error-message">{playerError}</div>
          <button 
            className="player-retry-btn"
            onClick={() => {
              setPlayerError(null);
              setIsLoading(true);
              // Reload the component
              window.dispatchEvent(new CustomEvent('playerChanged'));
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div ref={containerRef} className="player-container" />
    </div>
  );
};

export default VideoPlayer;
