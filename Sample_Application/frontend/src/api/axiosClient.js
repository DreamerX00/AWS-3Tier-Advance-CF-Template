import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_BASE}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message || error.message || 'Something went wrong';
        console.error('API Error:', message);
        return Promise.reject(error);
    }
);

export default api;
