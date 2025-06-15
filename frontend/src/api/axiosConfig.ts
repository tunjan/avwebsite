import axios from 'axios';
import { store } from '../store/store';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:9888', // Your backend server URL
});

// Request Interceptor: This function runs BEFORE each request is sent.
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the token from the Redux store
    const token = store.getState().auth.token;
    if (token) {
      // If a token exists, add it to the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;