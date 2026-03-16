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
        const message = getApiErrorMessages(error)[0] || 'Something went wrong';
        console.error('API Error:', message);
        return Promise.reject(error);
    }
);

export function getApiErrorMessages(error) {
    const data = error?.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
        return Object.values(data.errors);
    }
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        return data.errors;
    }
    if (data?.message) {
        return [data.message];
    }
    if (error?.message) {
        return [error.message];
    }
    return ['Something went wrong'];
}

export default api;
