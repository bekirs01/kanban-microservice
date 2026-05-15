import type { LoginAuthDto, RegisterAuthDto, ResponseAuthDto } from '@challenge/types';
import { api } from './api';

export const authService = {
  async login(credentials: LoginAuthDto): Promise<ResponseAuthDto> {
    const response = await api.post<ResponseAuthDto>('/api/auth/login', credentials);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(credentials: RegisterAuthDto): Promise<ResponseAuthDto> {
    const response = await api.post<ResponseAuthDto>('/api/auth/register', credentials);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async refreshToken(): Promise<ResponseAuthDto> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await api.post<ResponseAuthDto>('/api/auth/refresh', {
      refreshToken,
    });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  },

  async logout() {
    await api.post("api/auth/logout");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
