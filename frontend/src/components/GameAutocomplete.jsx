import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGameSuggestions } from '../api/suggestions';

const GameAutocomplete = ({ 
  value = '', 
  onChange, 
  onSelect, 
  placeholder = 'Search for games...', 
  className = '',
  disabled = false,
  showDetails = true,
  maxSuggestions = 10 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (query) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const results = await getGameSuggestions(query, maxSuggestions);
          setSuggestions(results);
          setShowDropdown(results.length > 0);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Error searching games:', error);
          setSuggestions([]);
          setShowDropdown(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
        setIsLoading(false);
      }
    }, 300);
  }, [maxSuggestions]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedSearch(newValue);
  };

  // Handle game selection
  const handleGameSelect = (game) => {
    onChange(game.name);
    onSelect?.(game);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleGameSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((game, index) => (
            <div
              key={game.id}
              onClick={() => handleGameSelect(game)}
              className={`px-3 py-3 cursor-pointer border-b border-gray-700 last:border-b-0 hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Game Cover */}
                {game.cover_url && showDetails ? (
                  <img
                    src={game.cover_url}
                    alt={game.name}
                    className="w-12 h-16 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{game.name}</div>
                  
                  {showDetails && (
                    <div className="text-sm text-gray-400 space-y-1">
                      {game.release_year && (
                        <div>Released: {game.release_year}</div>
                      )}
                      
                      {game.genres && game.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {game.genres.map((genre, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {game.platforms && game.platforms.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {game.platforms.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && suggestions.length === 0 && !isLoading && value.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          <div className="px-3 py-3 text-gray-400 text-center">
            No games found for "{value}"
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAutocomplete;
