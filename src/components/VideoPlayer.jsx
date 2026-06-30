// src/components/VideoPlayer.jsx
import React, { useEffect, useState, useRef } from 'react';
import { usePlayer, PLAYER_TYPES } from '../contexts/PlayerContext';
import PlayerSelector from './PlayerSelector';

const VideoPlayer = ({ movie }) => {
  const { selectedPlayer } = usePlayer();
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getSource = () => {
    if (movie?.m3u8) return movie.m3u8;
    if (movie?.mpdLink) return movie.mpdLink;
    if (movie?.link) return movie.link;
    return null;
  };

  const videoUrl = getSource();

  const cleanup = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    setIsLoading(true);
    setPlayerError(null);
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  };

  const loadCSS = (href) => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      document.head.appendChild(link);
    });
  };

  useEffect(() => {
    if (!videoUrl || !containerRef.current) {
      setIsLoading(false);
      return;
    }

    cleanup();

    const initializePlayer = async () => {
      try {
        if (selectedPlayer === PLAYER_TYPES.CLAPPR) {
          await initClappr();
        } else if (selectedPlayer === PLAYER_TYPES.SHAKA) {
          await initShaka();
        } else {
          await initPlyr();
        }
      } catch (error) {
        console.error('Player error:', error);
        if (isMounted.current) {
          setPlayerError(error.message || 'Failed to load player');
          setIsLoading(false);
        }
      }
    };

    initializePlayer();

    return () => {
      cleanup();
    };
  }, [videoUrl, selectedPlayer]);

  // ============ PLYR PLAYER WITH QUALITY SELECTOR ============
  const initPlyr = async () => {
    try {
      await loadCSS('https://cdn.plyr.io/3.7.8/plyr.css');
      await loadScript('https://cdn.plyr.io/3.7.8/plyr.polyfilled.js');
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@0.14.17/dist/hls.min.js');

      await new Promise(resolve => {
        const checkPlyr = () => {
          if (window.Plyr) {
            resolve();
          } else {
            setTimeout(checkPlyr, 100);
          }
        };
        checkPlyr();
      });

      const Plyr = window.Plyr;
      const Hls = window.Hls;

      const videoEl = document.createElement('video');
      videoEl.className = 'w-full h-full';
      videoEl.setAttribute('autoplay', 'yes');
      videoEl.setAttribute('controls', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.backgroundColor = '#000';
      containerRef.current.appendChild(videoEl);

      if (Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Get available qualities
          const availableQualities = hls.levels
            .map(level => level.height)
            .filter(Boolean)
            .sort((a, b) => b - a);
          
          const defaultQuality = availableQualities.includes(1080) ? 1080 : (availableQualities[0] || 360);

          const player = new Plyr(videoEl, {
            controls: [
              'play-large',
              'play',
              'progress',
              'current-time',
              'duration',
              'mute',
              'volume',
              'settings',
              'fullscreen'
            ],
            quality: {
              default: defaultQuality,
              options: availableQualities,
              forced: true,
              onChange: (quality) => {
                hls.levels.forEach((level, levelIndex) => {
                  if (level.height === quality) {
                    hls.currentLevel = levelIndex;
                  }
                });
              }
            },
            settings: ['quality', 'speed']
          });
          
          if (isMounted.current) {
            setIsLoading(false);
          }
          
          videoEl.muted = true;
          videoEl.play().then(() => {
            videoEl.muted = false;
          }).catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS error:', data);
            if (isMounted.current) {
              setPlayerError('Stream error');
              setIsLoading(false);
            }
          }
        });

      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = videoUrl;
        const player = new Plyr(videoEl, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
          settings: ['quality', 'speed']
        });
        if (isMounted.current) {
          setIsLoading(false);
        }
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});
      } else {
        throw new Error('HLS not supported');
      }

    } catch (error) {
      console.error('Plyr init error:', error);
      throw error;
    }
  };

  // ============ CLAPPR PLAYER ============
  const initClappr = async () => {
    try {
      await loadCSS('https://vjs.zencdn.net/8.10.0/video-js.min.css');
      await loadScript('https://vjs.zencdn.net/8.10.0/video.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest');
      await loadScript('https://cdn.jsdelivr.net/npm/videojs-contrib-hls@5.15.0/dist/videojs-contrib-hls.min.js');

      await new Promise(resolve => {
        const checkVideoJs = () => {
          if (window.videojs) {
            resolve();
          } else {
            setTimeout(checkVideoJs, 100);
          }
        };
        checkVideoJs();
      });

      const videojs = window.videojs;

      const videoEl = document.createElement('video');
      videoEl.id = 'clapper-player';
      videoEl.className = 'video-js vjs-big-play-centered vjs-16-9';
      videoEl.setAttribute('controls', 'true');
      videoEl.setAttribute('preload', 'auto');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      containerRef.current.appendChild(videoEl);

      const player = videojs('clapper-player', {
        autoplay: true,
        controls: true,
        preload: 'auto',
        sources: [{
          src: videoUrl,
          type: 'application/x-mpegURL'
        }]
      });

      player.ready(() => {
        if (isMounted.current) {
          setIsLoading(false);
        }
        player.play().catch(() => {});
      });

      player.on('error', () => {
        if (isMounted.current) {
          setPlayerError('Failed to play video');
          setIsLoading(false);
        }
      });

    } catch (error) {
      console.error('Clappr init error:', error);
      throw error;
    }
  };

  // ============ SHAKA PLAYER ============
  const initShaka = async () => {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.11/shaka-player.ui.min.js');
      await loadCSS('https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.11/controls.min.css');

      await new Promise(resolve => {
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
        throw new Error('Shaka not supported');
      }

      const videoEl = document.createElement('video');
      videoEl.className = 'w-full h-full';
      videoEl.setAttribute('autoplay', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.backgroundColor = '#000';
      containerRef.current.appendChild(videoEl);

      const player = new shaka.Player(videoEl);
      
      if (movie?.keyId && movie?.key) {
        player.configure({
          drm: {
            clearKeys: {
              [movie.keyId]: movie.key
            }
          }
        });
      }

      const ui = new shaka.ui.Overlay(player, containerRef.current, videoEl);
      ui.configure({
        controlPanelElements: ['play_pause', 'mute', 'volume', 'time_and_duration', 'spacer', 'quality', 'fullscreen']
      });

      await player.load(videoUrl);
      
      if (isMounted.current) {
        setIsLoading(false);
      }

      videoEl.muted = true;
      videoEl.play().then(() => {
        videoEl.muted = false;
      }).catch(() => {});

    } catch (error) {
      console.error('Shaka init error:', error);
      throw error;
    }
  };

  // Handle player change
  useEffect(() => {
    const handlePlayerChange = () => {
      cleanup();
      if (videoUrl) {
        setTimeout(() => {
          const initializePlayer = async () => {
            try {
              if (selectedPlayer === PLAYER_TYPES.CLAPPR) {
                await initClappr();
              } else if (selectedPlayer === PLAYER_TYPES.SHAKA) {
                await initShaka();
              } else {
                await initPlyr();
              }
            } catch (error) {
              console.error('Re-init error:', error);
            }
          };
          initializePlayer();
        }, 100);
      }
    };

    window.addEventListener('playerChanged', handlePlayerChange);
    return () => {
      window.removeEventListener('playerChanged', handlePlayerChange);
    };
  }, [videoUrl, selectedPlayer]);

  return (
    <div className="video-player-wrapper">
      <PlayerSelector />
      {isLoading && (
        <div className="player-loading-overlay active">
          <div className="player-loading-spinner"></div>
          <span>Loading {selectedPlayer.toUpperCase()}...</span>
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
              cleanup();
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
