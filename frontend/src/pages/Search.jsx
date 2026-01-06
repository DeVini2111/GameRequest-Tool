// src/pages/Search.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchGames } from "../api/igdb";
import GameCoverCard from "../components/GameCoverCard";

export default function Search() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Aktueller Query aus URL-Parametern
  const currentQuery = searchParams.get('q') || '';

  // Search function
  const performSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      if (searchTerm && searchTerm.length < 2) {
        setError("Search term must be at least 2 characters long");
      }
      setHasSearched(!!searchTerm);
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const searchResults = await searchGames(searchTerm, 50);
      setResults(searchResults || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'An unexpected error occurred');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Monitor URL parameter changes
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam && queryParam.length >= 2) {
      performSearch(queryParam);
    } else if (queryParam === null || queryParam === '') {
      // Clear results when no query
      setResults([]);
      setHasSearched(false);
      setError(null);
    } else if (queryParam && queryParam.length < 2) {
          setError("Search term must be at least 2 characters long");
      setHasSearched(true);
      setResults([]);
    }
  }, [searchParams]); // Reacts to every change in URL parameters

  return (
    <div className="w-full px-4 py-6">
      {/* Search Results Section */}
      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {hasSearched && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Search results for "{currentQuery}"
            </h1>
            {!loading && (
              <p className="text-gray-400">
                {results.length} {results.length === 1 ? 'game found' : 'games found'}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-blue-400 mt-4 text-lg">Searching...</p>
          </div>
        )}

        {hasSearched && !loading && results.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-12 justify-start">
            {results.map((game) => (
              <div key={game.id} className="flex flex-col group">
                <GameCoverCard 
                  variant="search"
                  gameId={game.id}
                  coverUrl={game.coverUrl || (game.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.webp` : 'https://via.placeholder.com/300x400/374151/9CA3AF?text=No+Cover')}
                  genres={game.genres || game.genre_names || []}
                  releaseDate={game.releaseDate || game.first_release_date}
                  gameName={game.name}
                />
              </div>
            ))}
          </div>
        )}

        {hasSearched && !loading && results.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No games found
            </h2>
            <p className="text-gray-400 mb-6">
              Try different search terms for "{currentQuery}".
            </p>
          </div>
        )}

        {!hasSearched && !currentQuery && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome to game search
            </h2>
            <p className="text-gray-400 mb-4">
              Use the search bar above to find games
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
