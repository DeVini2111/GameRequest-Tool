import { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NavigationSearch from './NavigationSearch';

export default function Navigation({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Back button logic - only for game detail pages
  const showBackButton = location.pathname.startsWith('/game/');
  
  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = (searchTerm = null) => {
    const query = searchTerm || searchQuery;
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleGameSelect = (game) => {
    // When a game is selected, NavigationSearch handles it directly
    // This function is kept for other purposes
    setSearchQuery(game.name);
  };

  const handleSearchSubmit = (searchTerm) => {
    // Regular text search (Enter without selection)
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const handleSearchInputChange = (value) => {
    setSearchQuery(value);
  };

  const goHome = () => {
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const goProfile = () => {
    navigate('/profile');
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const goRequests = () => {
    navigate('/requests');
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const goUsers = () => {
    navigate('/users');
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const goSettings = () => {
    navigate('/settings');
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const goLibrary = () => {
    navigate('/library');
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Synchronisiere Suchleiste mit URL-Parametern
  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      // Auf Search-Seite: Nutze URL-Parameter
      const queryParam = searchParams.get('q');
      if (queryParam) {
        setSearchQuery(queryParam);
      } else {
        setSearchQuery('');
      }
    } else {
      // Andere Seiten: Leere die Suchleiste
      setSearchQuery('');
    }
  }, [location.pathname, searchParams]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation - NICHT sticky/fixed, scrollt mit dem Content */}
      <nav className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 relative z-[1000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            
            {/* Logo - weiter links */}
            <div className="flex-shrink-0 mr-8">
              <div>
                <img 
                  src={logo} 
                  alt="GameRequest Logo" 
                  className="w-9 h-9 md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-200"
                />
              </div>
            </div>

            {/* Back button - compact, directly after logo */}
            {showBackButton && (
              <div className="flex-shrink-0 mr-6 lg:mr-8">
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-1 md:space-x-2 px-3 py-2 md:px-4 md:py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm md:text-sm font-medium hidden sm:block">Back</span>
                </button>
              </div>
            )}

            {/* Navigation Links - only desktop, directly after back button */}
            <div className="hidden lg:flex items-center space-x-8 flex-shrink-0">
              <button
                onClick={goHome}
                className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>Discover</span>
              </button>
              
              <button
                onClick={goRequests}
                className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/requests' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Requests</span>
              </button>
            </div>

            {/* Search Bar - grows in available space */}
            <div className="flex-1 max-w-[180px] sm:max-w-sm lg:max-w-2xl mx-4 lg:mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none z-10">
                  <button
                    onClick={() => handleSearch()}
                    className="h-4 w-4 md:h-5 md:w-5 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer pointer-events-auto"
                    type="button"
                    disabled={searchQuery.trim().length < 2}
                  >
                    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                
                <NavigationSearch
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onSelect={handleGameSelect}
                  onSearch={handleSearchSubmit}
                  placeholder="Search for games..."
                  className="w-full"
                  maxSuggestions={6}
                />
              </div>
            </div>

            {/* Profile & Actions - rechts */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              {/* User Profile Dropdown */}
              {user && (
                <div className="relative z-[999999]" ref={profileMenuRef} style={{ zIndex: 999999 }}>
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="hidden xl:block text-sm font-medium">{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="hidden xl:block text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                        Admin
                      </span>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-2xl border border-gray-700 z-[999999]" 
                         style={{ 
                           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                           position: 'absolute',
                           zIndex: 999999
                         }}>
                      <div className="py-1">
                        {/* Profile Header */}
                        <div className="px-4 py-3 border-b border-gray-700">
                          <p className="text-sm font-medium text-white">{user.username}</p>
                        </div>

                        {/* Profile Link */}
                        <button
                          onClick={goProfile}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </button>

                        {/* Users Link (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={goUsers}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Users
                          </button>
                        )}

                        {/* Library Link (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={goLibrary}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Library
                          </button>
                        )}

                        {/* Settings Link */}
                        <button
                          onClick={goSettings}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Settings
                        </button>

                        <div className="border-t border-gray-700 my-1"></div>

                        {/* Logout */}
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-400 hover:text-white p-2 md:p-2"
                >
                  <svg className="w-6 h-6 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu - only for Navigation Links */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-700">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button
                  onClick={goHome}
                  className={`flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === '/' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Discover</span>
                </button>
                
                <button
                  onClick={goRequests}
                  className={`flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === '/requests' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Requests</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Page-specific content - no padding needed anymore */}
      {children}
    </div>
  );
}