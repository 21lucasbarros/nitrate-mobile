import { create, type AxiosError } from 'axios';

import { useAuthStore } from './auth-store';
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const api = create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // a API gratuita pode demorar a acordar
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status ?? 0;
    // token recusado pelo backend: a sessão não vale mais
    if (status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().signOut();
    }
    const message =
      error.response?.data?.message ??
      (status === 0 ? 'Não foi possível falar com o servidor. Verifique sua conexão.' : `Erro ${status}`);
    return Promise.reject(new ApiError(message, status));
  },
);

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  return error instanceof ApiError ? error.message : fallback;
}
