// src/api/igdb.js

import { getApiBaseUrl } from '../config';

const BASE_URL = getApiBaseUrl();

/**
 * Fetch popular games from the last 12 months.
 * @param {number} limit - Maximum number of games to return
 * @returns {Promise<Array>} List of popular games
 */
async function fetchPopularBasic(limit) {
  const url = `${BASE_URL}/igdb/popular_recent?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error loading /igdb/popular_recent: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch your “Top 100 custom” list.
 * @param {number} limit – how many games you’d like (defaults to 100)
 */
async function fetchTop100Custom(limit) {
  const url = `${BASE_URL}/igdb/top100_custom?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error loading /igdb/top100_custom: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch popular games by type (e.g., 24h peak).
 * @param {number} limit - Maximum number of games to return
 * @param {number} type - Popularity type ID
 * @returns {Promise<Array>} List of games for this popularity type
 */
async function fetchPopularType(limit, type) {
  const url = `${BASE_URL}/igdb/popular/type?limit=${limit}&pop_type=${type}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error loading /igdb/popular/type: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch a specific Genre list.
 * @param {number} genre_id - IGDB Id of the genre
 * @param {number} min_rating_count - Minimum rating count of the games
 * @param {number} limit – how many games you’d like (defaults to 20)
 */
async function fetchGenre(genre_id, min_rating_count, limit) {
  const url = `${BASE_URL}/igdb/genre_list?genre_id=${genre_id}&min_rating_count=${min_rating_count}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error loading /igdb/genre_list: ${res.status}`);
  }
  return await res.json();
}


/**
 * Search for games by name.
 * @param {string} query - Search term (minimum 2 characters)
 * @param {number} limit - Maximum number of results (default 10, max 50)
 * @returns {Promise<Array>} Search results
 */
async function searchGames(query, limit = 10) {
  if (!query || query.length < 2) {
    throw new Error("Search query must be at least 2 characters long");
  }
  
  const url = `${BASE_URL}/igdb/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error searching: ${res.status}`);
  }
  return await res.json();
}



/**
 * Fetch detailed information about a game.
 * @param {number} gameId - IGDB game ID
 * @returns {Promise<Object>} Complete game details
 * @throws {Error} If game not found or fetch fails
 */
async function getGameDetail(gameId) {
  try {
    const response = await fetch(`${BASE_URL}/igdb/detail/${gameId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Game not found');
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching game detail:', error);
    throw error;
  }
}

export { fetchPopularBasic, fetchTop100Custom, fetchPopularType, fetchGenre, searchGames, getGameDetail};