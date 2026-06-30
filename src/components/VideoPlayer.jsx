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
  const initRef = useRef(false);

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

  // Load CSS helper
  const loadCSS = (href) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      document.head.appendChild(link);
    });
  };

  const cleanup = () => {
    if (playerRef.current) {
      try {
        if (playerRef.current.destroy) {
          playerRef.current.destroy();
        }
        if (playerRef.current.pause) {
          playerRef.current.pause();
        }
        if (playerRef.current.src) {
          playerRef.current.src = '';
          playerRef.current.load();
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
    initRef.current = false;
  };

  useEffect(() => {
    if (!movie || !containerRef.current || !source) {
      setIsLoading(false);
      return;
    }

    if (initRef.current) {
      return;
    }
    initRef.current = true;

    cleanup();

    const initializePlayer = async () => {
      try {
        if (selectedPlayer === PLAYER_TYPES.CLAPPR) {
          await initializeClapprPlayer();
        } else if (selectedPlayer === PLAYER_TYPES.SHAKA) {
          await initializeShakaPlayer();
        } else {
          await initializePlyrPlayer();
        }
      } catch (error) {
        console.error('Player error:', error);
        if (isMounted.current) {
          setPlayerError(error.message || 'Failed to load player');
          setIsLoading(false);
          showToast('⚠️ Failed to load player');
        }
      }
    };

    initializePlayer();

    return () => {
      cleanup();
    };
  }, [movie, source, selectedPlayer]);

  // ==================== CLAPPR PLAYER ====================
  const initializeClapprPlayer = async () => {
    try {
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Load Video.js
      await loadCSS('https://vjs.zencdn.net/8.10.0/video-js.min.css');
      await loadScript('https://vjs.zencdn.net/8.10.0/video.min.js');
      
      // Load HLS.js
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest');
      
      // Load Video.js HLS plugin
      await loadScript('https://cdn.jsdelivr.net/npm/videojs-contrib-hls@5.15.0/dist/videojs-contrib-hls.min.js');

      // Create video element
      const videoEl = document.createElement('video');
      videoEl.id = 'clapper-player';
      videoEl.className = 'video-js vjs-big-play-centered vjs-16-9';
      videoEl.setAttribute('controls', 'true');
      videoEl.setAttribute('preload', 'auto');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      containerRef.current.appendChild(videoEl);

      // Initialize Video.js player
      const player = videojs('clapper-player', {
        autoplay: true,
        muted: false,
        controls: true,
        preload: 'auto',
        techOrder: ['html5'],
        html5: {
          hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true
          }
        },
        sources: [{
          src: source.url,
          type: 'application/x-mpegURL'
        }]
      });

      playerRef.current = player;

      // Handle HLS with custom headers
      player.ready(function() {
        const videoElement = player.tech_.el_;
        
        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls({
            debug: false,
            enableWorker: true,
            xhrSetup: function(xhr, url) {
              xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
              xhr.setRequestHeader('Referer', window.location.origin + window.location.pathname);
              xhr.setRequestHeader('Origin', window.location.origin);
              xhr.setRequestHeader('Cache-Control', 'no-cache');
              if (url.includes('.m3u8')) {
                xhr.setRequestHeader('Accept', 'application/vnd.apple.mpegurl, application/x-mpegurl, */*');
              }
            }
          });
          
          hls.loadSource(source.url);
          hls.attachMedia(videoElement);
          
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            if (isMounted.current) {
              setIsLoading(false);
              setIsReady(true);
            }
            player.play().catch(e => console.log('Autoplay blocked:', e));
          });
          
          hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
              console.error('HLS fatal error:', data);
              if (isMounted.current) {
                setPlayerError('Stream error - Please try again');
                setIsLoading(false);
              }
            }
          });
          
          playerRef.current._hls = hls;
        } else {
          setIsLoading(false);
          setPlayerError('HLS not supported in this browser');
        }
      });

      // Handle player errors
      player.on('error', function() {
        const error = player.error();
        if (error) {
          if (error.code === 4) {
            setPlayerError('Stream failed to load (403/Expired)');
          } else {
            setPlayerError(`Playback error: ${error.message || 'Unknown'}`);
          }
          setIsLoading(false);
        }
      });

    } catch (error) {
      console.error('Clappr player error:', error);
      setPlayerError('Failed to load Clappr player');
      setIsLoading(false);
      throw error;
    }
  };

  // ==================== SHAKA PLAYER ====================
  const initializeShakaPlayer = async () => {
    try {
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Load Shaka Player
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.11/shaka-player.ui.min.js');
      await loadCSS('https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.11/controls.min.css');

      const shaka = window.shaka;
      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        throw new Error('Shaka player not supported');
      }

      const videoEl = document.createElement('video');
      videoEl.className = 'w-full h-full';
      videoEl.setAttribute('autoplay', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('preload', 'metadata');
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.backgroundColor = '#000';
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
        };
        player.configure(config);
      }

      // Setup UI overlay
      const ui = new shaka.ui.Overlay(player, containerRef.current, videoEl);
      ui.configure({
        controlPanelElements: [
          'play_pause', 'mute', 'volume', 'time_and_duration',
          'spacer', 'language', 'captions', 'picture_in_picture',
          'quality', 'fullscreen'
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
      
      playerRef.current = player;

      if (isMounted.current) {
        setIsLoading(false);
        setIsReady(true);
      }

      // Force autoplay
      videoEl.muted = true;
      videoEl.play().then(() => {
        videoEl.muted = false;
      }).catch(() => {});

    } catch (error) {
      console.error('Shaka player error:', error);
      setPlayerError('Failed to load Shaka player');
      setIsLoading(false);
      throw error;
    }
  };

  // ==================== PLYR PLAYER ====================
  const initializePlyrPlayer = async () => {
    try {
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Load Plyr
      await loadCSS('https://cdn.plyr.io/3.7.8/plyr.css');
      await loadScript('https://cdn.plyr.io/3.7.8/plyr.polyfilled.js');
      
      // Load HLS.js
      await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.1.4/dist/hls.min.js');

      const videoEl = document.createElement('video');
      videoEl.id = 'player';
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

      const Plyr = window.Plyr;

      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxMaxBufferLength: 100
        });
        hls.loadSource(source.url);
        hls.attachMedia(videoEl);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const availableQualities = hls.levels
            .map(level => level.height)
            .filter(Boolean)
            .sort((a, b) => b - a);
          const defaultQuality = availableQualities.includes(1080) ? 1080 : (availableQualities[0] || 360);

          const player = new Plyr(videoEl, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
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
            }
          });

          playerRef.current = player;
          if (isMounted.current) {
            setIsLoading(false);
            setIsReady(true);
          }

          videoEl.muted = true;
          videoEl.play().then(() => {
            videoEl.muted = false;
          }).catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data);
            if (isMounted.current) {
              setPlayerError('Stream error - Please try again');
              setIsLoading(false);
            }
          }
        });

        playerRef.current._hls = hls;

      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = source.url;
        const player = new Plyr(videoEl, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen']
        });
        playerRef.current = player;
        if (isMounted.current) {
          setIsLoading(false);
          setIsReady(true);
        }
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});
      } else {
        throw new Error('HLS not supported');
      }

    } catch (error) {
      console.error('Plyr player error:', error);
      setPlayerError('Failed to load Plyr player');
      setIsLoading(false);
      throw error;
    }
  };

  // Handle player change event
  useEffect(() => {
    const handlePlayerChange = () => {
      cleanup();
      initRef.current = false;
      if (movie && source) {
        const initializePlayer = async () => {
          try {
            if (selectedPlayer === PLAYER_TYPES.CLAPPR) {
              await initializeClapprPlayer();
            } else if (selectedPlayer === PLAYER_TYPES.SHAKA) {
              await initializeShakaPlayer();
            } else {
              await initializePlyrPlayer();
            }
          } catch (error) {
            console.error('Re-initialization error:', error);
          }
        };
        initializePlayer();
      }
    };

    window.addEventListener('playerChanged', handlePlayerChange);
    return () => {
      window.removeEventListener('playerChanged', handlePlayerChange);
    };
  }, [movie, source, selectedPlayer]);

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
        <div className="player-loading-overlay active">
          <div className="player-loading-spinner"></div>
          <span>Loading {selectedPlayer.toUpperCase()} player...</span>
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
              initRef.current = false;
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
