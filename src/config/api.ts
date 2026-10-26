const configuredApi = (import.meta as any).env.VITE_API_MAIN as string | undefined;
const defaultApi = (import.meta as any).env.DEV ? 'http://localhost:9000/api' : '';
const mainApi = (configuredApi || defaultApi).replace(/\/$/, '');

export const API_ENDPOINTS = {
  MAIN: mainApi,
  SECONDARY: ((import.meta as any).env.VITE_API_SECONDARY || mainApi).replace(/\/$/, ''),
  TERTIARY: ((import.meta as any).env.VITE_API_TERTIARY || mainApi).replace(/\/$/, ''),
};

export function apiUrl(path: string): string {
  if (!API_ENDPOINTS.MAIN) {
    throw new Error('Falta configurar VITE_API_MAIN para el entorno de producción.');
  }
  return `${API_ENDPOINTS.MAIN}/${path.replace(/^\//, '')}`;
}