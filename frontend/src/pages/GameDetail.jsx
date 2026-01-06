import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGameDetail } from '../api/igdb';
import { useAuth } from '../contexts/AuthContext';
import GameCoverCard from '../components/GameCoverCard';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';
import { getApiBaseUrl } from '../config';

export default function GameDetail() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedVideos, setLoadedVideos] = useState(new Set());
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [gameStatus, setGameStatus] = useState(null);
  const [requestModal, setRequestModal] = useState({ isOpen: false, gameName: '' });
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [visibleSimilarGames, setVisibleSimilarGames] = useState(new Set());
  const [bannerScreenshotIndex, setBannerScreenshotIndex] = useState(null);
  const [isScreenshotFullscreen, setIsScreenshotFullscreen] = useState(false);

  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    const fetchGameDetail = async () => {
      try {
        setLoading(true);
        const gameData = await getGameDetail(gameId);
        setGame(gameData);
        
        // Set static banner screenshot on first load
        if (gameData.screenshots && gameData.screenshots.length > 0) {
          setBannerScreenshotIndex(Math.floor(Math.random() * gameData.screenshots.length));
        }
        
        // Check comprehensive game status including availability
        await checkGameStatus();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetail();
  }, [gameId]);

  useEffect(() => {
    if (!game?.screenshots?.length) return;

    const totalScreenshots = game.screenshots.length;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsScreenshotFullscreen(false);
      } else if (e.key === 'ArrowLeft' && activeScreenshot > 0) {
        setActiveScreenshot(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && activeScreenshot < totalScreenshots - 1) {
        setActiveScreenshot(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScreenshotFullscreen, activeScreenshot, game?.screenshots?.length]);
  useEffect(() => {
    if (!game?.similar_games_details?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const gameId = parseInt(entry.target.dataset.gameId);
            setVisibleSimilarGames(prev => new Set([...prev, gameId]));
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before entering viewport
    );

    const elements = document.querySelectorAll('[data-game-id]');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, [game?.similar_games_details?.length]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRating = (rating) => {
    if (!rating) return null;
    return Math.round(rating);
  };

  // Video Loading Handler
  const handleVideoLoad = (videoId) => {
    setLoadedVideos(prev => new Set([...prev, videoId]));
  };

  // Check comprehensive game status using new Option 2 hybrid system
  const checkGameStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/requests/game/${gameId}/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const status = await response.json();
        setGameStatus(status);
      }
    } catch (error) {
      console.error('Error checking game status:', error);
    }
  };

  const handleRequestGame = () => {
    if (game) {
      setRequestModal({ isOpen: true, gameName: game.name });
    }
  };

  const confirmRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        game_name: game.name,
        igdb_id: parseInt(gameId),
        igdb_cover_url: game.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp` : null,
        igdb_genres: game.genres?.map(g => g.name).join(', ') || null,
        comment: `Request for ${game.name}`
      };

      const response = await fetch(`${API_BASE}/api/requests/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setRequestModal({ isOpen: false, gameName: '' });
        checkGameStatus(); // Refresh status after request
      } else {
        throw new Error('Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to create the request. Please try again.',
        type: 'error'
      });
    }
  };

  const cancelRequest = () => {
    setRequestModal({ isOpen: false, gameName: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-white mt-4">Loading game details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Game not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Backdrop Background - Reduziert */}
      {game.cover?.image_id && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(https://images.igdb.com/igdb/image/upload/t_1080p/${game.cover.image_id}.jpg)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/95 via-gray-900/98 to-gray-900"></div>
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Hero banner with static random screenshot */}
        {game.screenshots && game.screenshots.length > 0 && bannerScreenshotIndex !== null && (
          <div className="relative">
            {/* Static random screenshot as full-width banner */}
            <div 
              className="h-[80vh] bg-cover bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(https://images.igdb.com/igdb/image/upload/t_1080p/${game.screenshots[bannerScreenshotIndex].image_id}.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%'
              }}
            >
              {/* Backdrop Gradient Overlay - reduzierte Transparenz */}
              
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 to-gray-900/20"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-transparent to-gray-900/60"></div>
              
              {/* Content overlay on banner */}
              <div className="relative z-10 h-full flex items-end">
                <div className="max-w-7xl mx-auto px-6 pb-8 w-full">
                  <div className="flex items-end gap-6">
                    {/* Cover auf dem Banner */}
                    <div className="flex-shrink-0">
                      <div className="rounded-lg overflow-hidden shadow-2xl" style={{ width: '160px', height: '220px' }}>
                        <img
                          src={
                            game.cover?.image_id
                              ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.cover.image_id}.jpg`
                              : 'https://via.placeholder.com/160x220/374151/9CA3AF?text=No+Cover'
                          }
                          alt={`${game.name} Cover`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Titel und Quick Info */}
                    <div className="flex-1 text-white mb-4">
                      <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-2xl">{game.name}</h1>
                      
                      {/* Quick Info Pills */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className="bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                          {formatDate(game.first_release_date)}
                        </span>
                        {game.genres?.slice(0, 3).map((genre) => (
                          <span key={genre.name} className="bg-gray-800/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm shadow-lg">
                            {genre.name}
                          </span>
                        ))}
                      </div>
                      
                      {/* Ratings */}
                      {(game.rating || game.aggregated_rating) && (
                        <div className="flex gap-4">
                          {game.rating && (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-12 bg-blue-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                                <span className="font-bold text-lg">{formatRating(game.rating)}</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium drop-shadow-lg">IGDB</div>
                                <div className="text-xs text-gray-300 drop-shadow-lg">Rating</div>
                              </div>
                            </div>
                          )}
                          {game.aggregated_rating && (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-12 bg-green-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                                <span className="font-bold text-lg">{formatRating(game.aggregated_rating)}</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium drop-shadow-lg">Critics</div>
                                <div className="text-xs text-gray-300 drop-shadow-lg">Rating</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content - direkt an Bildrand angesetzt */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Detailed Info */}
            <div className="lg:col-span-1 space-y-8">
              {/* Game Details Container - summarized */}
              <div className="bg-gray-800/90 rounded-lg p-6 space-y-6">
                {/* Request management section */}
                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">GAME AVAILABILITY</h3>
                  
                  {/* Status Anzeige basierend auf gameStatus */}
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    {gameStatus?.is_available 
                      ? 'This game is already installed and ready to play.'
                      : 'Create a request for your community.'
                    }
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    {gameStatus?.is_available ? (
                      // Game is available - indicator only
                      <div className="w-full bg-green-600/20 border-2 border-green-500/30 text-green-400 text-sm font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-default">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Available
                      </div>
                    ) : gameStatus?.can_request ? (
                      // Game can be requested - show button
                      <button 
                        onClick={handleRequestGame}
                        disabled={!user}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create request
                      </button>
                    ) : gameStatus?.user_has_request ? (
                      // Already requested - show status badge
                      <div className={`w-full py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                        gameStatus.user_request_status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                        gameStatus.user_request_status === 'approved' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                        gameStatus.user_request_status === 'completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        gameStatus.user_request_status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        'bg-gray-500/10 border-gray-500/30 text-gray-400'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {gameStatus.user_request_status === 'pending' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                          {gameStatus.user_request_status === 'approved' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          )}
                          {gameStatus.user_request_status === 'completed' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                          {gameStatus.user_request_status === 'rejected' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                        <span className="text-sm font-medium">
                          Request: {
                            gameStatus.user_request_status === 'pending' ? 'Pending' :
                            gameStatus.user_request_status === 'approved' ? 'Approved' :
                            gameStatus.user_request_status === 'completed' ? 'Available' :
                            gameStatus.user_request_status === 'rejected' ? 'Rejected' :
                            'Unknown'
                          }
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* About the game */}
                {game.summary && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">About the game</h2>
                    <p className="text-gray-300 leading-relaxed">{game.summary}</p>
                  </div>
                )}

                {/* Trennlinie */}
                <div className="border-t border-gray-600/50 my-6"></div>

                {/* Detailed Info */}
                <div className="space-y-4">
                  {game.platforms && game.platforms.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">PLATFORMS</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.platforms.slice(0, 6).map((platform) => (
                          <span
                            key={platform.name}
                            className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-sm"
                          >
                            {platform.name}
                          </span>
                        ))}
                        {game.platforms.length > 6 && (
                          <span className="px-2 py-1 text-gray-400 text-sm">
                            +{game.platforms.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entwickler & Publisher */}
                  {game.involved_companies && game.involved_companies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">DEVELOPERS & PUBLISHERS</h3>
                      <div className="space-y-3">
                        {game.involved_companies.slice(0, 4).map((involvement, index) => (
                          <div key={index} className="flex items-center gap-3">
                            {involvement.company.logo?.image_id && (
                              <div className="w-10 h-10 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={`https://images.igdb.com/igdb/image/upload/t_thumb/${involvement.company.logo.image_id}.webp`}
                                  alt={involvement.company.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white text-sm truncate">{involvement.company.name}</p>
                              <p className="text-xs text-gray-400">
                                {involvement.developer && involvement.publisher ? "Dev & Pub" :
                                 involvement.developer ? "Developer" :
                                 involvement.publisher ? "Publisher" : "Company"}
                              </p>
                            </div>
                          </div>
                        ))}
                        {game.involved_companies.length > 4 && (
                          <p className="text-xs text-gray-400 text-center">
                            +{game.involved_companies.length - 4} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Screenshots und Storyline */}
            <div className="lg:col-span-2 space-y-8">
              {/* Screenshots */}
              {game.screenshots && game.screenshots.length > 0 && (
                <div className="bg-gray-800/90 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-6">Screenshots</h2>
                  
                  {/* Main Screenshot with Media Controls */}
                  <div className="mb-6 relative group">
                    <div className="aspect-video rounded-lg overflow-hidden cursor-pointer bg-gray-900 relative">
                      <img
                        src={`https://images.igdb.com/igdb/image/upload/t_1080p/${game.screenshots[activeScreenshot].image_id}.jpg`}
                        alt={`${game.name} Screenshot ${activeScreenshot + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => setIsScreenshotFullscreen(true)}
                      />
                      
                      {/* Navigation Arrows - visible on hover */}
                      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        {activeScreenshot > 0 && (
                          <button
                            onClick={() => setActiveScreenshot(prev => prev - 1)}
                            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                          >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {activeScreenshot < game.screenshots.length - 1 && (
                          <button
                            onClick={() => setActiveScreenshot(prev => prev + 1)}
                            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors ml-auto"
                          >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Fullscreen and Counter Badge */}
                      <div className="absolute top-4 right-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/60 px-3 py-2 rounded-lg text-white text-sm font-medium">
                          {activeScreenshot + 1}/{game.screenshots.length}
                        </div>
                        <button
                          onClick={() => setIsScreenshotFullscreen(true)}
                          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center transition-colors"
                          title="Fullscreen"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12 0h4v-4m0 12h-4v4m4-4v-4m-12 4H6v4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  {game.screenshots.length > 1 && (
                    <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-2">
                      {game.screenshots.slice(0, 10).map((screenshot, index) => (
                        <div 
                          key={index} 
                          className={`aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-colors flex-shrink-0 ${
                            activeScreenshot === index 
                              ? 'border-blue-500' 
                              : 'border-transparent hover:border-gray-500'
                          }`}
                          onClick={() => setActiveScreenshot(index)}
                        >
                          <img
                            src={`https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`}
                            alt={`${game.name} Screenshot ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {game.screenshots.length > 10 && (
                    <div className="mt-4 text-center">
                      <span className="text-gray-400 text-sm">
                        +{game.screenshots.length - 10} more screenshots
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Storyline */}
              {game.storyline && (
                <div className="bg-gray-800/90 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Story</h2>
                  <p className="text-gray-300 leading-relaxed">{game.storyline}</p>
                </div>
              )}
            </div>
          </div>

          {/* Videos section spanning both columns */}
          {game.videos && game.videos.length > 0 && (
            <div className="bg-gray-800/90 rounded-lg p-6 mt-8">
              <h2 className="text-2xl font-semibold mb-6">Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {game.videos.slice(0, 8).map((video, index) => (
                  <div key={video.video_id || index} className="aspect-video relative group">
                    {!loadedVideos.has(video.video_id) ? (
                      <div 
                        className="relative w-full h-full bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => handleVideoLoad(video.video_id)}
                      >
                        <img 
                          src={`https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`}
                          alt={`${game.name} Video ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.log('Thumbnail failed for:', video.video_id);
                            e.target.style.display = 'none';
                          }}
                        />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"></path>
                            </svg>
                          </div>
                        </div>

                        {/* Video Title */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                          <p className="text-white text-sm font-medium line-clamp-2">
                            {video.name || `${game.name} - Video ${index + 1}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Loaded YouTube iframe
                      <iframe
                        src={`https://www.youtube.com/embed/${video.video_id}?rel=0&modestbranding=1`}
                        title={video.name || `${game.name} Video ${index + 1}`}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* More videos indicator */}
              {game.videos.length > 8 && (
                <div className="text-center mt-6">
                  <span className="text-gray-400 text-sm">
                    +{game.videos.length - 8} more videos available
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Similar Games Section */}
          {game.similar_games_details && game.similar_games_details.length > 0 && (
            <div className="bg-gray-800/90 rounded-lg p-6 mt-8">
              <h2 className="text-2xl font-semibold mb-6">Similar games</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                {game.similar_games_details
                  .filter(similarGame => similarGame.name && similarGame.name.trim() !== '')
                  .map((similarGame) => (
                  <div 
                    key={similarGame.id}
                    data-game-id={similarGame.id}
                    className="group cursor-pointer rounded-xl bg-gray-800/70 border border-gray-700 hover:border-blue-500/60 transition-colors"
                    onClick={() => navigate(`/game/${similarGame.id}`)}
                  >
                    {/* Cover Image */}
                    <div className="w-full aspect-[3/4] rounded-t-xl overflow-hidden relative">
                      <img
                        src={
                          similarGame.cover?.image_id 
                            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${similarGame.cover.image_id}.webp`
                            : 'https://via.placeholder.com/300x400/1f2937/9CA3AF?text=No+Cover'
                        }
                        alt={`${similarGame.name} Cover`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                        <div className="text-white text-sm font-semibold line-clamp-2 leading-tight">
                          {similarGame.name}
                        </div>
                        {similarGame.first_release_date && (
                          <div className="text-xs text-gray-200 bg-black/50 px-2 py-1 rounded-md">
                            {new Date(similarGame.first_release_date * 1000).getFullYear()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Minimal meta bar */}
                    <div className="px-3 py-3 flex items-center justify-between text-xs text-gray-300">
                      {similarGame.genre_names && similarGame.genre_names.length > 0 ? (
                        <span className="truncate">{similarGame.genre_names[0]}</span>
                      ) : (
                        <span className="text-gray-500">Genre n/a</span>
                      )}
                      <span className="text-gray-500">View</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* "More similar games" indicator */}
              {game.similar_games_details.filter(game => game.name && game.name.trim() !== '').length >= 12 && (
                <div className="text-center mt-8">
                  <button 
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                    onClick={() => {
                      console.log('Load more similar games...');
                    }}
                  >
                    Show more similar games
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Request Confirmation Modal */}
      <ConfirmModal
        isOpen={requestModal.isOpen}
        onConfirm={confirmRequest}
        onCancel={cancelRequest}
        title="Request game"
        message={`Do you want to request "${requestModal.gameName}"?`}
        confirmText="Create request"
        cancelText="Cancel"
        confirmColor="blue"
        icon="plus"
      >
        {user?.role === 'admin' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-300 text-sm">
              <strong>Admin note:</strong> Your request will be approved automatically.
            </p>
          </div>
        )}
      </ConfirmModal>

      {/* Info Modal */}
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
      />

      {/* Fullscreen Screenshot Modal */}
      {isScreenshotFullscreen && game?.screenshots && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setIsScreenshotFullscreen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsScreenshotFullscreen(false)}
            className="absolute top-6 right-6 z-60 w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Main Image */}
          <div 
            className="relative w-full h-full flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`https://images.igdb.com/igdb/image/upload/t_original/${game.screenshots[activeScreenshot].image_id}.jpg`}
              alt={`${game.name} Screenshot ${activeScreenshot + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6">
            {/* Previous Button */}
            {activeScreenshot > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveScreenshot(prev => prev - 1);
                }}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Counter */}
            <div className="bg-black/80 px-6 py-3 rounded-lg text-white font-semibold text-lg">
              {activeScreenshot + 1}/{game.screenshots.length}
            </div>

            {/* Next Button */}
            {activeScreenshot < game.screenshots.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveScreenshot(prev => prev + 1);
                }}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Keyboard Navigation Hint */}
          <div className="absolute bottom-8 right-8 text-gray-400 text-sm">
            ESC to close
          </div>
        </div>
      )}
    </div>
  );
}