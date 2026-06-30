// src/components/VideoPlayer.jsx
import React, { useEffect, useState, useRef } from 'react';
import { usePlayer, PLAYER_TYPES } from '../contexts/PlayerContext';
import PlayerSelector from './PlayerSelector';

const VideoPlayer = ({ movie }) => {
  const { selectedPlayer, setPlayer } = usePlayer();
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
    if (movie?.m3u8) return { url: movie.m3u8, type: 'hls' };
    if (movie?.mpdLink) return { url: movie.mpdLink, type: 'mpd', keyId: movie.keyId, key: movie.key };
    if (movie?.link) return { url: movie.link, type: 'hls' };
    return null;
  };

  const source = getSource();

  // Auto-detect player based on stream type
  const getDefaultPlayer = () => {
    if (source?.type === 'mpd') {
      return PLAYER_TYPES.SHAKA;
    } else if (source?.type === 'hls') {
      return PLAYER_TYPES.PLYR;
    }
    return PLAYER_TYPES.PLYR;
  };

  // Use selected player or auto-detect based on stream type
  const effectivePlayer = selectedPlayer || getDefaultPlayer();

  // If stream type is MPD and user hasn't selected a player, default to Shaka
  useEffect(() => {
    if (source?.type === 'mpd' && !localStorage.getItem('cinearena_selected_player')) {
      setPlayer(PLAYER_TYPES.SHAKA);
    } else if (source?.type === 'hls' && !localStorage.getItem('cinearena_selected_player')) {
      setPlayer(PLAYER_TYPES.PLYR);
    }
  }, [source, setPlayer]);

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
    if (!source || !containerRef.current) {
      setIsLoading(false);
      return;
    }

    cleanup();

    const initializePlayer = async () => {
      try {
        if (effectivePlayer === PLAYER_TYPES.CLAPPR) {
          await initClappr();
        } else if (effectivePlayer === PLAYER_TYPES.SHAKA) {
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
  }, [source, effectivePlayer]);

  // ============ PLYR PLAYER (Default for HLS) ============
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

      if (source.type === 'hls' && Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(source.url);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
              setPlayerError('Stream error - Please try again');
              setIsLoading(false);
            }
          }
        });

      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = source.url;
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
        // Fallback to direct video
        videoEl.src = source.url;
        const player = new Plyr(videoEl, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen']
        });
        if (isMounted.current) {
          setIsLoading(false);
        }
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});
      }

    } catch (error) {
      console.error('Plyr init error:', error);
      throw error;
    }
  };

  // ============ SHAKA PLAYER (Default for DASH/MPD) ============
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
      
      // Configure DRM if needed (for MPD streams)
      if (source.keyId && source.key) {
        player.configure({
          drm: {
            clearKeys: {
              [source.keyId]: source.key
            }
          },
          streaming: {
            lowLatencyMode: true,
            bufferingGoal: 15,
            rebufferingGoal: 2,
            bufferBehind: 15,
            retryParameters: {
              timeout: 10000,
              maxAttempts: 5,
              baseDelay: 300,
              backoffFactor: 1.2
            },
            segmentRequestTimeout: 8000,
            segmentPrefetchLimit: 2,
            useNativeHlsOnSafari: true
          },
          manifest: {
            retryParameters: { timeout: 8000, maxAttempts: 3 }
          }
        });
      } else {
        // Default streaming config
        player.configure({
          streaming: {
            lowLatencyMode: true,
            bufferingGoal: 15,
            rebufferingGoal: 2,
            bufferBehind: 15
          }
        });
      }

      // Setup UI overlay
      const ui = new shaka.ui.Overlay(player, containerRef.current, videoEl);
      ui.configure({
        controlPanelElements: [
          'play_pause', 
          'mute', 
          'volume', 
          'time_and_duration',
          'spacer', 
          'language', 
          'captions', 
          'picture_in_picture',
          'quality', 
          'fullscreen'
        ],
        volumeBarColors: {
          base: 'rgba(135, 206, 235, 0.35)',
          level: 'rgb(255,255,255)'
        },
        seekBarColors: {
          base: 'rgba(50, 55, 61)',
          buffered: 'rgba(135, 206, 235, 0.6)',
          played: 'rgb(255, 255, 255)'
        }
      });

      player.addEventListener('error', (event) => {
        console.error('Shaka Player Error:', event.detail);
        if (isMounted.current) {
          setPlayerError('Stream error - Please try again');
          setIsLoading(false);
        }
      });

      await player.load(source.url);
      
      if (isMounted.current) {
        setIsLoading(false);
      }

      // Force autoplay
      videoEl.muted = true;
      videoEl.play().then(() => {
        videoEl.muted = false;
      }).catch(() => {});

    } catch (error) {
      console.error('Shaka init error:', error);
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
          src: source.url,
          type: source.type === 'mpd' ? 'application/dash+xml' : 'application/x-mpegURL'
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

  // Handle player change
  useEffect(() => {
    const handlePlayerChange = () => {
      cleanup();
      if (source) {
        setTimeout(() => {
          const initializePlayer = async () => {
            try {
              if (effectivePlayer === PLAYER_TYPES.CLAPPR) {
                await initClappr();
              } else if (effectivePlayer === PLAYER_TYPES.SHAKA) {
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
  }, [source, effectivePlayer]);

  // Get player display name
  const getPlayerDisplayName = () => {
    if (effectivePlayer === PLAYER_TYPES.SHAKA) return 'Shaka';
    if (effectivePlayer === PLAYER_TYPES.CLAPPR) return 'Clappr';
    return 'Plyr';
  };

  return (
    <div className="video-player-wrapper">
      <PlayerSelector />
      {source && (
        <div className="player-stream-info">
          <span className="stream-type">{source.type.toUpperCase()}</span>
          <span className="player-name">{getPlayerDisplayName()}</span>
          <span className="player-status">● Live</span>
        </div>
      )}
      {isLoading && (
        <div className="player-loading-overlay active">
          <div className="player-loading-spinner"></div>
          <span>Loading {getPlayerDisplayName()} player...</span>
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
