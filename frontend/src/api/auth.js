/**
 * Authentication API utilities
 */

import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

/**
 * Authenticated fetch wrapper
 * Automatically adds authorization header with JWT token
 */
export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const finalOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  // Construct full URL if relative path is provided
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  return fetch(fullUrl, finalOptions);
};

/**
 * Login user
 */
export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  return response;
};

/**
 * Register user
 */
export const register = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  return response;
};

/**
 * Get current user profile
 */
export const getProfile = async () => {
  return authFetch('/api/auth/profile');
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  return authFetch('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

/**
 * Change password
 */
export const changePassword = async (currentPassword, newPassword) => {
  return authFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
};

/**
 * Logout (clear local storage)
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Get stored user data
 */
export const getStoredUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

/**
 * Store user data and token
 */
export const storeAuthData = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
