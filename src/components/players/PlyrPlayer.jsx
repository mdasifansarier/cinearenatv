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
    if (!containerRef.current || !source) {
      setIsLoading(false);
      return;
    }

    const loadClapprPlayer = async () => {
      try {
        // Load Clappr core
        if (!window.Clappr) {
          const script1 = document.createElement('script');
          script1.src = 'https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js';
          document.head.appendChild(script1);

          // Load HLS.js playback plugin
          const script2 = document.createElement('script');
          script2.src = 'https://cdn.jsdelivr.net/npm/@clappr/hlsjs-playback@1.2.0/dist/hlsjs-playback.min.js';
          document.head.appendChild(script2);

          // Load Level Selector plugin
          const script3 = document.createElement('script');
          script3.src = 'https://cdn.jsdelivr.net/gh/clappr/clappr-level-selector-plugin@latest/dist/level-selector.min.js';
          document.head.appendChild(script3);

          // Load CDNBye plugin for P2P
          const script4 = document.createElement('script');
          script4.src = 'https://cdn.jsdelivr.net/npm/cdnbye@latest/dist/clappr-plugin.min.js';
          document.head.appendChild(script4);

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
        }

        const Clappr = window.Clappr;
        const LevelSelector = window.LevelSelector;
        const CDNByeClapprPlugin = window.CDNByeClapprPlugin;
        const HlsjsPlayback = window.HlsjsPlayback;

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const playerDiv = document.createElement('div');
        playerDiv.id = 'clappr-player-container';
        playerDiv.style.width = '100%';
        playerDiv.style.height = '100%';
        containerRef.current.appendChild(playerDiv);

        // Build plugins array
        const plugins = [];
        if (HlsjsPlayback) plugins.push(HlsjsPlayback);
        if (LevelSelector) plugins.push(LevelSelector);
        if (CDNByeClapprPlugin) plugins.push(CDNByeClapprPlugin);

        const player = new Clappr.Player({
          source: source.url,
          parentId: '#clappr-player-container',
          autoPlay: true,
          autoPlayVisible: 'partial',
          mute: true,
          height: '100%',
          width: '100%',
          poster: source.poster || '',
          plugins: plugins,
          playback: {
            hlsjsConfig: {
              maxMaxBufferLength: 100,
              enableWorker: true,
              lowLatencyMode: true,
              p2pConfig: {
                logLevel: 'debug',
                live: true
              }
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
        }, 1500);

        if (onReady && isMounted.current) onReady();

      } catch (error) {
        console.error('Clappr player error:', error);
        if (isMounted.current) {
          setError(error.message || 'Failed to load Clappr player');
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
      <div ref={containerRef} className="clappr-player-container" />
    </div>
  );
};

export default ClapprPlayer;