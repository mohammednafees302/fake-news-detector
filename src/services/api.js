const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('verifynews_token');

    const { headers: customHeaders, ...restOptions } = options;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...customHeaders,
        },
        ...restOptions,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
}

export const api = {
    // Auth
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => request('/auth/me'),
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    verifyOtp: (body) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

    // Analyze
    analyze: (body) => request('/analyze', { method: 'POST', body: JSON.stringify(body) }),
    getHistory: (page = 1) => request(`/analyze/history?page=${page}`),
    getAnalysis: (id) => request(`/analyze/${id}`),
    deleteAnalysis: (id) => request(`/analyze/${id}`, { method: 'DELETE' }),

    // Reports
    submitReport: (body) => request('/reports', { method: 'POST', body: JSON.stringify(body) }),
    getReports: (page = 1) => request(`/reports?page=${page}`),
    upvoteReport: (id) => request(`/reports/${id}/upvote`, { method: 'POST' }),

    // Stats
    getStats: () => request('/stats'),
    getUserStats: () => request('/stats/user'),
};

export default api;
