import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('verifynews_token');
        if (token) {
            api.getMe()
                .then(data => setUser(data.user))
                .catch(() => {
                    localStorage.removeItem('verifynews_token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await api.login({ email, password });
        localStorage.setItem('verifynews_token', data.token);
        setUser(data.user);
        return data;
    };

    const register = async (username, email, password) => {
        const data = await api.register({ username, email, password });
        localStorage.setItem('verifynews_token', data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('verifynews_token');
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
