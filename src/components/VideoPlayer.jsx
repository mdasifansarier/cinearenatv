// src/components/VideoPlayer.jsx
import React, { useEffect, useState, useRef } from 'react';
import { usePlayer, PLAYER_TYPES } from '../contexts/PlayerContext';
import PlayerSelector from './PlayerSelector';
import { showToast } from './Toast';

const VideoPlayer = ({ movie }) => {
  const { selectedPlayer } = usePlayer();
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const shakaRef = useRef(null);
  const clapprRef = useRef(null);
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
    if (movie?.m3u8) return { url: movie.m3u8, type: 'hls', poster: movie.logo || '' };
    if (movie?.mpdLink) return { url: movie.mpdLink, type: 'mpd', keyId: movie.keyId, key: movie.key, poster: movie.logo || '' };
    if (movie?.link) return { url: movie.link, type: 'hls', poster: movie.logo || '' };
    return null;
  };

  const source = getSource();

  const destroyPlayer = () => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (e) {}
      hlsRef.current = null;
    }
    if (shakaRef.current) {
      try { shakaRef.current.destroy(); } catch (e) {}
      shakaRef.current = null;
    }
    if (clapprRef.current) {
      try { clapprRef.current.destroy(); } catch (e) {}
      clapprRef.current = null;
    }
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
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

  useEffect(() => {
    if (!movie || !containerRef.current || !source) {
      setIsLoading(false);
      return;
    }

    destroyPlayer();

    const initializePlayer = async () => {
      try {
        if (selectedPlayer === PLAYER_TYPES.SHAKA) {
          await initializeShakaPlayer();
        } else if (selectedPlayer === PLAYER_TYPES.CLAPPR) {
          await initializeClapprPlayer();
        } else {
          await initializeHlsPlyrPlayer();
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
      setTimeout(destroyPlayer, 50);
    };
  }, [movie, source, selectedPlayer]);

  // Initialize HLS + Plyr Player
  const initializeHlsPlyrPlayer = async () => {
    try {
      if (!window.Hls) {
        const hlsScript = document.createElement('script');
        hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.1.4/dist/hls.min.js';
        document.head.appendChild(hlsScript);
        await new Promise((resolve) => {
          const checkHls = () => {
            if (window.Hls) { resolve(); } else { setTimeout(checkHls, 100); }
          };
          checkHls();
        });
      }

      if (!window.Plyr) {
        const plyrScript = document.createElement('script');
        plyrScript.src = 'https://cdn.jsdelivr.net/npm/plyr@3.6.12/dist/plyr.min.js';
        document.head.appendChild(plyrScript);
        const plyrCss = document.createElement('link');
        plyrCss.rel = 'stylesheet';
        plyrCss.href = 'https://cdn.jsdelivr.net/npm/plyr@3.6.12/dist/plyr.css';
        document.head.appendChild(plyrCss);
        await new Promise((resolve) => {
          const checkPlyr = () => {
            if (window.Plyr) { resolve(); } else { setTimeout(checkPlyr, 100); }
          };
          checkPlyr();
        });
      }

      const Hls = window.Hls;
      const Plyr = window.Plyr;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const videoEl = document.createElement('video');
      videoEl.className = 'w-full h-full';
      videoEl.setAttribute('autoplay', 'yes');
      videoEl.setAttribute('controls', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('preload', 'metadata');
      videoEl.setAttribute('poster', source.poster || '');
      containerRef.current.appendChild(videoEl);

      if (source.type === 'hls' && Hls.isSupported()) {
        const hls = new Hls({ 
          maxMaxBufferLength: 100,
          enableWorker: true,
          lowLatencyMode: true
        });
        hls.loadSource(source.url);
        hls.attachMedia(videoEl);
        hlsRef.current = hls;

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
            setPlayerError(null);
            setIsReady(true);
          }

          videoEl.muted = true;
          videoEl.play().then(() => {
            videoEl.muted = false;
          }).catch(() => {});
        });
      } else {
        videoEl.src = source.url;
        const player = new Plyr(videoEl, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen']
        });
        playerRef.current = player;
        if (isMounted.current) {
          setIsLoading(false);
          setPlayerError(null);
          setIsReady(true);
        }
        videoEl.muted = true;
        videoEl.play().then(() => {
          videoEl.muted = false;
        }).catch(() => {});
      }

    } catch (error) {
      throw error;
    }
  };

  // Initialize Shaka Player
  const initializeShakaPlayer = async () => {
    try {
      if (!window.shaka) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/shaka-player@4.16.2/dist/shaka-player.ui.min.js';
        document.head.appendChild(script);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/shaka-player@4.16.2/dist/controls.css';
        document.head.appendChild(link);
        await new Promise((resolve) => {
          const checkShaka = () => {
            if (window.shaka) { resolve(); } else { setTimeout(checkShaka, 100); }
          };
          checkShaka();
        });
      }

      const shaka = window.shaka;
      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        throw new Error('Shaka player not supported');
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const videoEl = document.createElement('video');
      videoEl.className = 'w-full h-full';
      videoEl.setAttribute('autoplay', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('preload', 'metadata');
      videoEl.setAttribute('poster', source.poster || '');
      containerRef.current.appendChild(videoEl);

      const player = new shaka.Player(videoEl);
      
      if (source.keyId && source.key) {
        const config = {
          drm: {
            clearKeys: {
              [source.keyId]: source.key
            }
          },
          manifest: { defaultPresentationDelay: 5 },
          streaming: {
            lowLatencyMode: true,
            bufferingGoal: 10,
            rebufferingGoal: 2,
            safeSeekOffset: 5
          }
        };
        player.configure(config);
      }

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

      await player.load(source.url);
      shakaRef.current = player;
      playerRef.current = player;

      if (isMounted.current) {
        setIsLoading(false);
        setPlayerError(null);
        setIsReady(true);
      }

      videoEl.muted = true;
      videoEl.play().then(() => {
        videoEl.muted = false;
      }).catch(() => {});

    } catch (error) {
      throw error;
    }
  };

  // Initialize Clappr Player
  const initializeClapprPlayer = async () => {
    try {
      if (!window.Clappr) {
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.jsdelivr.net/npm/@clappr/player@latest/dist/clappr.min.js';
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/@clappr/hlsjs-playback@1.2.0/dist/hlsjs-playback.min.js';
        document.head.appendChild(script2);

        const script3 = document.createElement('script');
        script3.src = 'https://cdn.jsdelivr.net/gh/clappr/clappr-level-selector-plugin@latest/dist/level-selector.min.js';
        document.head.appendChild(script3);

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
      if (HlsjsPlayback) plugins.push(HlsjsPlayback);
      if (LevelSelector) plugins.push(LevelSelector);

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
            lowLatencyMode: true
          }
        }
      });

      clapprRef.current = player;
      playerRef.current = player;

      if (isMounted.current) {
        setIsLoading(false);
        setPlayerError(null);
        setIsReady(true);
      }

      setTimeout(() => {
        if (player) {
          player.setVolume(100);
          player.setMute(false);
        }
      }, 1500);

    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="video-player-wrapper">
      <PlayerSelector />
      {source && isReady && (
        <div className="player-stream-info">
          <span className="stream-type">{source.type.toUpperCase()}</span>
          <span className="player-status">● Live</span>
        </div>
      )}
      {playerError && (
        <div className="player-error-container">
          <div className="player-error-icon">⚠️</div>
          <div className="player-error-message">{playerError}</div>
        </div>
      )}
      <div ref={containerRef} className="player-container" />
    </div>
  );
};

export default VideoPlayer;