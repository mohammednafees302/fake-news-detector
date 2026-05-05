import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Checking your account...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}

export default ProtectedRoute;
