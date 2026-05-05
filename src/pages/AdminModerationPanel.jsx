import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import '../styles/AdminPanel.css';

const getToken = () => localStorage.getItem('verifynews_token');

export default function AdminModerationPanel() {
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (user?.is_admin) {
            fetchFlags();
        }
    }, [user, filter]);

    const fetchFlags = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/features/moderation-flags?limit=50`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            let data = await response.json();
            
            if (filter !== 'all') {
                data = data.filter(f => f.status === filter);
            }
            
            setFlags(data);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveFlag = async (flagId, resolution) => {
        try {
            const response = await fetch(`/api/features/moderation-flags/${flagId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ resolution })
            });

            if (response.ok) {
                alert('Flag resolved!');
                fetchFlags();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    if (!user?.is_admin) {
        return <div className="admin-container"><p>Access Denied</p></div>;
    }

    if (loading) return <div className="admin-container"><p>Loading...</p></div>;

    return (
        <div className="admin-container">
            <h1>🛡️ Moderation Dashboard</h1>

            <div className="filter-tabs">
                <button 
                    className={filter === 'pending' ? 'active' : ''}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({flags.length})
                </button>
                <button 
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    All Flags
                </button>
            </div>

            <div className="flags-list">
                {flags.map(flag => (
                    <div key={flag.id} className="flag-card">
                        <div className="flag-header">
                            <h3>{flag.content_type}: {flag.content_id}</h3>
                            <span className={`status status-${flag.status}`}>{flag.status}</span>
                        </div>
                        <p className="reason"><strong>Reason:</strong> {flag.reason}</p>
                        <small>Flagged by: User | Date: {new Date(flag.created_at).toLocaleDateString()}</small>
                        
                        {flag.status === 'pending' && (
                            <div className="actions">
                                <button 
                                    className="btn-approve"
                                    onClick={() => handleResolveFlag(flag.id, 'approved')}
                                >
                                    Approve Flag
                                </button>
                                <button 
                                    className="btn-dismiss"
                                    onClick={() => handleResolveFlag(flag.id, 'dismissed')}
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {flags.length === 0 && (
                <p className="empty-state">No flags to review. Keep up the good work! 👍</p>
            )}
        </div>
    );
}
