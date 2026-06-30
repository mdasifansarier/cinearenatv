// src/components/players/ShakaPlayer.jsx
import React, { useEffect, useRef, useState } from 'react';

const ShakaPlayer = ({ source, onError, onReady }) => {
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

    const loadShakaPlayer = async () => {
      try {
        // Load Shaka Player from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/shaka-player@4.16.2/dist/shaka-player.ui.min.js';
        document.head.appendChild(script);

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/shaka-player@4.16.2/dist/controls.css';
        document.head.appendChild(link);

        // Wait for Shaka to load
        await new Promise((resolve) => {
          const checkShaka = () => {
            if (window.shaka) {
              resolve();
            } else {
              setTimeout(checkShaka, 100);
            }
          };
          checkShaka();
        });

        const shaka = window.shaka;
        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          throw new Error('Shaka player not supported');
        }

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const videoEl = document.createElement('video');
        videoEl.className = 'w-full h-full';
        videoEl.setAttribute('autoplay', 'true');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('preload', 'metadata');
        containerRef.current.appendChild(videoEl);

        const player = new shaka.Player(videoEl);
        
        // Configure DRM if needed
        if (source.keyId && source.key) {
          const config = {
            drm: {
              clearKeys: {
                [source.keyId]: source.key
              }
            },
            manifest: {
              defaultPresentationDelay: 5
            },
            streaming: {
              lowLatencyMode: true,
              bufferingGoal: 10,
              rebufferingGoal: 2,
              safeSeekOffset: 5
            }
          };
          player.configure(config);
        }

        // Setup UI overlay
        const ui = new shaka.ui.Overlay(player, containerRef.current, videoEl);
        ui.configure({
          addBigPlayButton: true,
          controlPanelElements: [
            "mute",
            "play_pause",
            "time_and_duration",
            "spacer",
            "quality",
            "picture_in_picture",
            "fullscreen"
          ],
          seekBarColors: {
            base: "white",
            buffered: "#e50914",
            played: "#e50914"
          }
        });

        // Load the stream
        await player.load(source.url);
        playerRef.current = player;

        if (isMounted.current) {
          setIsLoading(false);
          setError(null);
        }

        // Auto-play with unmute
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});

        if (onReady && isMounted.current) onReady();

      } catch (error) {
        console.error('Shaka player error:', error);
        if (isMounted.current) {
          setError(error.message);
          setIsLoading(false);
          if (onError) onError(error);
        }
      }
    };

    loadShakaPlayer();

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
        <div className="player-error-message">Shaka Player Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      {isLoading && (
        <div className="player-loading-overlay">
          <div className="player-loading-spinner"></div>
          <span>Loading Shaka Player...</span>
        </div>
      )}
      <div ref={containerRef} className="shaka-player-container" />
    </div>
  );
};

export default ShakaPlayer;