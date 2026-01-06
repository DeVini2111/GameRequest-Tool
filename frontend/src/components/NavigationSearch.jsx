import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGameSuggestions } from '../api/suggestions';

const NavigationSearch = ({ 
  value = '', 
  onChange, 
  onSelect, 
  onSearch, // New prop for normal search
  placeholder = 'Search for games...', 
  className = '',
  disabled = false,
  maxSuggestions = 6 
}) => {
  const navigate = useNavigate();
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

  // Handle game selection - navigate directly to game detail page
  const handleGameSelect = (game) => {
    onChange(game.name);
    onSelect?.(game);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    
    // Navigate directly to game detail page
    navigate(`/game/${game.id}`);
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        // Trigger normal search with current value
        if (onSearch && value.trim().length >= 2) {
          onSearch(value.trim());
        }
        inputRef.current?.blur();
        return;
      }
      return;
    }

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
      {/* Input Field with Navigation Styling */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full pl-8 md:pl-10 pr-2 md:pr-3 py-1.5 md:py-2 border border-transparent rounded-md leading-5 bg-gray-700 text-gray-300 placeholder-gray-400 text-sm md:text-base focus:outline-none focus:bg-white focus:border-white focus:ring-2 focus:ring-blue-500 focus:text-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {suggestions.map((game, index) => (
            <div
              key={game.id}
              onClick={() => handleGameSelect(game)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-700 last:border-b-0 hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Game Cover - smaller for navigation */}
                {game.cover_url ? (
                  <img
                    src={game.cover_url}
                    alt={game.name}
                    className="w-8 h-10 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-10 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Game Info - compact for navigation */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{game.name}</div>
                  <div className="text-xs text-gray-400">
                    {game.release_year && `${game.release_year}`}
                    {game.release_year && game.genres?.length > 0 && ' • '}
                    {game.genres?.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && suggestions.length === 0 && !isLoading && value.trim().length >= 2 && (
        <div className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
          <div className="px-4 py-3 text-gray-400 text-center text-sm">
            No games found for "{value}"
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationSearch;
