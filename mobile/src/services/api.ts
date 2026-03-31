import axios from 'axios';
import { router } from 'expo-router';
import { getToken, removeToken } from './authStorage';

export const api = axios.create({
  baseURL: 'http://192.168.1.12:3333',
  timeout: 5000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await removeToken();
      router.replace('/login');
    }

    return Promise.reject(error);
  }
);