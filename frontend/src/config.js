// Runtime configuration helper
// This allows environment variables to be set at container runtime
// instead of build time

const isLocalhostValue = (value) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes('localhost') || normalized.includes('127.0.0.1');
};

const getRuntimeValue = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window._env_?.VITE_API_BASE_URL;
};

export const getApiBaseUrl = () => {
  // Runtime config injected via config.js (if present)
  const runtimeValue = getRuntimeValue();
  if (runtimeValue && !isLocalhostValue(runtimeValue)) {
    return runtimeValue;
  }

  // Build-time env var (used for local dev overrides)
  const buildTimeValue = import.meta.env.VITE_API_BASE_URL;
  if (buildTimeValue && !isLocalhostValue(buildTimeValue)) {
    return buildTimeValue;
  }

  // In production containers, default to same-origin
  if (import.meta.env.MODE === 'production') {
    return '';
  }

  // Local development default
  return buildTimeValue || 'http://127.0.0.1:8000';
};

export default {
  getApiBaseUrl
};
