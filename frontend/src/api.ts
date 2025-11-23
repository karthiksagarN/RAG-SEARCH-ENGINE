import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

export default api;
