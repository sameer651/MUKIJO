import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8001',
});

// Add a request interceptor to include userId/owner_id in params if available
api.interceptors.request.use((config) => {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  if (userId) {
    if (config.method === 'get') {
      config.params = { ...config.params, owner_id: userId };
    } else if (config.method === 'post' || config.method === 'put') {
      if (typeof config.data === 'object' && !config.data.owner_id) {
        config.data.owner_id = userId;
      }
    }
  }
  return config;
});

export default api;
