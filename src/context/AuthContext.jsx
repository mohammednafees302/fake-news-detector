import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'verifynews_token';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(AUTH_STORAGE_KEY);
        if (token) {
            api.getMe()
                .then(data => setUser(data.user))
                .catch(() => {
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleAuthExpired = () => setUser(null);
        window.addEventListener('verifynews:auth-expired', handleAuthExpired);
        return () => window.removeEventListener('verifynews:auth-expired', handleAuthExpired);
    }, []);

    const login = async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem(AUTH_STORAGE_KEY, data.token);
        setUser(data.user);
        return data;
    };

    const register = async (username, email, password) => {
        const data = await api.register({ username, email, password });
        localStorage.setItem(AUTH_STORAGE_KEY, data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;
