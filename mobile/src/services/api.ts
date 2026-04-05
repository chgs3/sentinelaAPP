import axios from 'axios';
import { getToken, removeToken } from './authStorage';
import { ENV } from '../constants/env';

export const api = axios.create({
  baseURL: ENV.apiUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('[API ERROR]', {
      message: error?.message,
      status: error?.response?.status,
      url: error?.config
        ? `${error.config.baseURL}${error.config.url}`
        : undefined,
    });

    if (error?.response?.status === 401) {
      await removeToken();
    }

    return Promise.reject(error);
  }
);