// export const API_ENDPOINTS = {
//     MAIN: (import.meta as any).env.VITE_API_MAIN || 'http://10.106.1.49:6001/api',
//     SECONDARY: (import.meta as any).env.VITE_API_SECONDARY || 'http://10.106.1.49:6001/api',
//     TERTIARY: (import.meta as any).env.VITE_API_TERTIARY || 'http://10.106.1.49:6001/api',
// };
export const API_ENDPOINTS = {
    MAIN: (import.meta as any).env.VITE_API_MAIN || 'http://localhost:9000/api',
    SECONDARY: (import.meta as any).env.VITE_API_SECONDARY || 'http://localhost:9000/api',
    TERTIARY: (import.meta as any).env.VITE_API_TERTIARY || 'http://localhost:9000/api',
};