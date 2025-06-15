import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/authSlice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9888';

const axiosInstance = axios.create({
  baseURL: API_URL,
});


// Request Interceptor: Add the auth token to every request.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors, especially 401 for expired tokens.
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.error("Authentication error: 401 Unauthorized. Logging out.");
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default axiosInstance;