import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Checking admin access...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.is_admin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default AdminRoute;
