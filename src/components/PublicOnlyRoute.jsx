import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PublicOnlyRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default PublicOnlyRoute;
