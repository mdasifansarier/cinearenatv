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
    if (movie?.m3u8) return { url: movie.m3u8, type: 'hls' };
    if (movie?.mpdLink) return { url: movie.mpdLink, type: 'mpd', keyId: movie.keyId, key: movie.key };
    if (movie?.link) return { url: movie.link, type: 'mp4' };
    return null;
  };

  const source = getSource();

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
  }, [source, selectedPlayer]);

  // ============ PLYR PLAYER - Supports MP4, HLS, and MPD ============
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
      videoEl.setAttribute('preload', 'metadata');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.backgroundColor = '#000';
      containerRef.current.appendChild(videoEl);

      // Check stream type and handle accordingly
      if (source.type === 'mp4') {
        // MP4 - Direct playback
        videoEl.src = source.url;
        
        const player = new Plyr(videoEl, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
          settings: ['speed']
        });
        
        if (isMounted.current) {
          setIsLoading(false);
        }
        
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});

      } else if (source.type === 'hls' && Hls && Hls.isSupported()) {
        // HLS - Use HLS.js
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
              setPlayerError('Stream error');
              setIsLoading(false);
            }
          }
        });

      } else if (source.type === 'mpd') {
        // MPD/DASH - Try native playback or fallback
        try {
          // Try to play MPD directly (some browsers support it)
          videoEl.src = source.url;
          
          const player = new Plyr(videoEl, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
            settings: ['speed']
          });
          
          if (isMounted.current) {
            setIsLoading(false);
          }
          
          videoEl.muted = true;
          videoEl.play().then(() => {
            videoEl.muted = false;
          }).catch(() => {
            // If MPD fails, try Shaka as fallback
            if (isMounted.current) {
              setPlayerError('MPD stream not supported in Plyr, switching to Shaka...');
              setTimeout(() => {
                initShaka();
              }, 500);
            }
          });
        } catch (error) {
          console.error('MPD playback error:', error);
          // Fallback to Shaka
          if (isMounted.current) {
            setPlayerError('MPD stream not supported in Plyr, switching to Shaka...');
            setTimeout(() => {
              initShaka();
            }, 500);
          }
        }

      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari
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
        throw new Error('Stream format not supported');
      }

    } catch (error) {
      console.error('Plyr init error:', error);
      throw error;
    }
  };

  // ============ CLAPPR PLAYER ============
  const initClappr = async () => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@clappr/hlsjs-playback@1.2.0/dist/hlsjs-playback.min.js');

      await new Promise(resolve => {
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
      const HlsjsPlayback = window.HlsjsPlayback;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const playerDiv = document.createElement('div');
      playerDiv.id = 'clappr-player-container';
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      containerRef.current.appendChild(playerDiv);

      const plugins = [];
      if (HlsjsPlayback) {
        plugins.push(HlsjsPlayback);
      }

      // Determine source type for Clappr
      let clapprSource = source.url;
      
      const player = new Clappr.Player({
        source: clapprSource,
        parentId: '#clappr-player-container',
        autoPlay: true,
        autoPlayVisible: 'partial',
        mute: true,
        height: '100%',
        width: '100%',
        poster: movie?.logo || '',
        plugins: plugins,
        playback: {
          hlsjsConfig: {
            maxMaxBufferLength: 100,
            enableWorker: true,
            lowLatencyMode: true
          }
        }
      });

      if (isMounted.current) {
        setIsLoading(false);
      }

      setTimeout(() => {
        if (player) {
          player.setVolume(100);
          player.setMute(false);
        }
      }, 1500);

    } catch (error) {
      console.error('Clappr init error:', error);
      // Fallback to Plyr
      if (isMounted.current) {
        setPlayerError('Clappr failed, trying Plyr...');
        setTimeout(() => {
          initPlyr();
        }, 500);
      }
      throw error;
    }
  };

  // ============ SHAKA PLAYER - Supports MP4, HLS, MPD ============
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
          }
        });
      }

      // Setup UI overlay
      const ui = new shaka.ui.Overlay(player, containerRef.current, videoEl);
      ui.configure({
        controlPanelElements: ['play_pause', 'mute', 'volume', 'time_and_duration', 'spacer', 'quality', 'fullscreen']
      });

      // Load the stream
      await player.load(source.url);
      
      if (isMounted.current) {
        setIsLoading(false);
      }

      videoEl.muted = true;
      videoEl.play().then(() => {
        videoEl.muted = false;
      }).catch(() => {});

    } catch (error) {
      console.error('Shaka init error:', error);
      // Fallback to direct video for MP4
      if (source.type === 'mp4') {
        try {
          const videoEl = document.createElement('video');
          videoEl.className = 'w-full h-full';
          videoEl.setAttribute('autoplay', 'true');
          videoEl.setAttribute('controls', 'true');
          videoEl.setAttribute('playsinline', 'true');
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'contain';
          videoEl.style.backgroundColor = '#000';
          videoEl.src = source.url;
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(videoEl);
          
          if (isMounted.current) {
            setIsLoading(false);
          }
          
          videoEl.muted = true;
          videoEl.play().then(() => {
            videoEl.muted = false;
          }).catch(() => {});
        } catch (e) {
          throw error;
        }
      } else {
        throw error;
      }
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
  }, [source, selectedPlayer]);

  // Get player display name
  const getPlayerDisplayName = () => {
    if (selectedPlayer === PLAYER_TYPES.SHAKA) return 'Shaka';
    if (selectedPlayer === PLAYER_TYPES.CLAPPR) return 'Clappr';
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
