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

  // ============ PLYR PLAYER WITH QUALITY SELECTOR + MP4 SUPPORT ============
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

      // Check if it's an MP4 file (by extension or if HLS fails)
      const isMp4 = videoUrl && (
        videoUrl.toLowerCase().includes('.mp4') || 
        videoUrl.toLowerCase().includes('.webm') ||
        videoUrl.toLowerCase().includes('.mkv') ||
        !videoUrl.toLowerCase().includes('.m3u8')
      );

      if (isMp4) {
        // MP4 - Direct playback
        videoEl.src = videoUrl;
        
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

      } else if (Hls && Hls.isSupported()) {
        // HLS - Use HLS.js
        const hls = new Hls();
        hls.loadSource(videoUrl);
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
            // Try direct playback as fallback
            try {
              videoEl.src = videoUrl;
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
            } catch (e) {
              if (isMounted.current) {
                setPlayerError('Stream error');
                setIsLoading(false);
              }
            }
          }
        });

      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari
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
        // Fallback: Try direct playback
        videoEl.src = videoUrl;
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

  // ============ CLAPPR PLAYER - FIXED VERSION ============
  const initClappr = async () => {
    try {
      // Load Clappr from CDN
      await loadScript('https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js');
      
      // Load HLS.js playback plugin
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

      // Clear container
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

      const player = new Clappr.Player({
        source: videoUrl,
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

      // Unmute after autoplay
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
