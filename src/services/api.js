const API_BASE = import.meta.env.VITE_API_URL || '/api';
const AUTH_STORAGE_KEY = 'verifynews_token';

function emitAuthExpired() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('verifynews:auth-expired'));
    }
}

async function request(endpoint, options = {}) {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);

    const { headers: customHeaders, ...restOptions } = options;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...customHeaders,
        },
        ...restOptions,
    };

    let response;
    try {
        response = await fetch(`${API_BASE}${endpoint}`, config);
    } catch (networkErr) {
        throw new Error('Cannot reach the server. The backend may be starting up (this can take ~30 seconds on free hosting). Please try again shortly.');
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (response.status === 401 && token) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        emitAuthExpired();
    }

    if (!response.ok) {
        throw new Error(data?.error || `Server error (${response.status}). Please try again.`);
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
    updateReportStatus: (id, status) => request(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    deleteReportAdmin: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

    // Stats
    getStats: () => request('/stats'),
    getUserStats: () => request('/stats/user'),
    getAdminOverview: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.set('search', params.search);
        if (params.reportStatus) searchParams.set('reportStatus', params.reportStatus);
        if (params.userRole) searchParams.set('userRole', params.userRole);
        const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return request(`/stats/admin${suffix}`);
    },
    updateUserRoleAdmin: (id, is_admin) => request(`/auth/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ is_admin }) }),
    deleteUserAdmin: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
};

export default api;
