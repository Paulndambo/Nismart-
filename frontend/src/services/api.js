import axios from 'axios';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Generate idempotency key
export const generateIdempotencyKey = () => {
  return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// User APIs (for admin or transfer destination selection)
export const getUsers = async () => {
  try {
    const response = await api.get('/auth/list/');
    const data = response.data;
    
    // Handle paginated response (DRF returns { count, next, previous, results })
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      return data.results;
    }
    
    // Handle direct array response
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Account APIs
export const getBalance = async (userId) => {
  try {
    const response = await api.get(`/balance/${userId}/`);
    return response.data || null;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
};

// Transaction APIs
export const deposit = async (accountId, amount) => {
  const response = await api.post('/deposit/', {
    account_id: accountId,
    amount: parseFloat(amount),
    idempotency_key: generateIdempotencyKey(),
  });
  return response.data;
};

export const transfer = async (sourceAccountId, destinationAccountId, amount) => {
  const response = await api.post('/transfer/', {
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    amount: parseFloat(amount),
    idempotency_key: generateIdempotencyKey(),
  });
  return response.data;
};

export const withdraw = async (accountId, amount) => {
  const response = await api.post('/withdraw/', {
    account_id: accountId,
    amount: parseFloat(amount),
    idempotency_key: generateIdempotencyKey(),
  });
  return response.data;
};

export const getTransactionHistory = async (userId) => {
  try {
    const response = await api.get(`/transactions/${userId}/`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

// Admin APIs
export const getAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats/');
    return response.data || null;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return null;
  }
};

export const getAdminTransactions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);

    const response = await api.get(`/admin/transactions/?${params.toString()}`);
    const data = response.data;
    
    // Handle both direct array and paginated response
    if (Array.isArray(data)) {
      return { results: data, count: data.length, page: 1, page_size: data.length };
    }
    
    // Handle paginated response
    if (data && typeof data === 'object') {
      return {
        results: Array.isArray(data.results) ? data.results : [],
        count: data.count || 0,
        page: data.page || 1,
        page_size: data.page_size || 50,
      };
    }
    
    return { results: [], count: 0, page: 1, page_size: 50 };
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return { results: [], count: 0, page: 1, page_size: 50 };
  }
};

export default api;

