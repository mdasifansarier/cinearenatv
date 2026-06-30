// src/components/players/ClapprPlayer.jsx
import React, { useEffect, useRef, useState } from 'react';

const ClapprPlayer = ({ source, onError, onReady }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !source) return;

    const loadClapprPlayer = async () => {
      try {
        // Load Clappr from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@clappr/player@0.4.7/dist/clappr.min.js';
        document.head.appendChild(script);

        // Wait for Clappr to load
        await new Promise((resolve) => {
          const checkClappr = () => {
            if (window.Clappr) {
              resolve();
            } else {
              setTimeout(checkClappr, 100);
            }
          };
          checkClappr();
        });

        const Clappr = window.Clappr;

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const playerDiv = document.createElement('div');
        playerDiv.id = 'clappr-player-container';
        playerDiv.className = 'w-full h-full';
        containerRef.current.appendChild(playerDiv);

        const player = new Clappr.Player({
          source: source.url,
          parentId: '#clappr-player-container',
          autoPlay: true,
          width: '100%',
          height: '100%',
          mute: true,
          volume: 100,
          poster: source.poster || '',
          plugins: [],
          playback: {
            hlsjsConfig: {
              maxMaxBufferLength: 100,
              enableWorker: true,
              lowLatencyMode: true
            }
          }
        });

        playerRef.current = player;

        if (isMounted.current) {
          setIsLoading(false);
          setError(null);
        }

        // Unmute after autoplay
        setTimeout(() => {
          if (player) {
            player.setVolume(100);
            player.setMute(false);
          }
        }, 1000);

        if (onReady && isMounted.current) onReady();

      } catch (error) {
        console.error('Clappr player error:', error);
        if (isMounted.current) {
          setError(error.message);
          setIsLoading(false);
          if (onError) onError(error);
        }
      }
    };

    loadClapprPlayer();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [source, onError, onReady]);

  if (error) {
    return (
      <div className="player-error-container">
        <div className="player-error-icon">⚠️</div>
        <div className="player-error-message">Clappr Player Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      {isLoading && (
        <div className="player-loading-overlay">
          <div className="player-loading-spinner"></div>
          <span>Loading Clappr Player...</span>
        </div>
      )}
      <div ref={containerRef} className="clappr-player-container" />
    </div>
  );
};

export default ClapprPlayer;