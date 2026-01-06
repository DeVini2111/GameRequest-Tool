import { authFetch } from './auth';

/**
 * Fetches game suggestions for autocomplete from the API
 * @param {string} query - Search term
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of game suggestions
 */
export const getGameSuggestions = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await authFetch(
      `/api/import/suggestions?q=${encodeURIComponent(query.trim())}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching game suggestions:', error);
    return [];
  }
};
