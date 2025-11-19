import api from './api';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Token management
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const removeTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// User management
export const getStoredUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const updateStoredUser = (user) => {
  setStoredUser(user);
};

export const removeStoredUser = () => {
  localStorage.removeItem(USER_KEY);
};

// Auth API calls
export const register = async (userData) => {
  const response = await api.post('/auth/register/', userData);
  const { user, tokens } = response.data;
  
  setTokens(tokens.access, tokens.refresh);
  setStoredUser(user);
  
  // Set default auth header
  api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
  
  return { user, tokens };
};

export const login = async (username, password) => {
  const response = await api.post('/auth/login/', { username, password });
  const { user, tokens } = response.data;
  
  setTokens(tokens.access, tokens.refresh);
  setStoredUser(user);
  
  // Set default auth header
  api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
  
  return { user, tokens };
};

export const logout = () => {
  removeTokens();
  removeStoredUser();
  delete api.defaults.headers.common['Authorization'];
};

export const getProfile = async () => {
  const response = await api.get('/auth/profile/');
  const user = response.data;
  setStoredUser(user);
  return user;
};

export const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/token/refresh/', {
      refresh: refreshToken,
    });

    const { access } = response.data;
    localStorage.setItem(TOKEN_KEY, access);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    return access;
  } catch (error) {
    logout();
    throw error;
  }
};

// Setup axios interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Set auth header if token exists
const token = getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

