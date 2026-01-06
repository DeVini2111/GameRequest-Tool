import { authFetch } from './auth';
import { getApiBaseUrl } from '../config';

const API_BASE = getApiBaseUrl();

/**
 * Import games from text input.
 * @param {string[]} games - Array of game names
 * @returns {Promise<Object>} Import result with success/failure counts
 * @throws {Error} If import fails
 */
export const importGamesFromText = async (games) => {
  const response = await authFetch(`${API_BASE}/api/import/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ games }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to import games');
  }

  return response.json();
};

/**
 * Get import status information.
 * @returns {Promise<Object>} Import status data
 * @throws {Error} If fetch fails
 */
export const getImportStatus = async () => {
  const response = await authFetch(`${API_BASE}/api/import/status`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to get import status');
  }

  return response.json();
};
