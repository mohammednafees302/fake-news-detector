import React, { useState, useEffect } from 'react';
import '../styles/TrendingClaims.css';

export default function TrendingClaims() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    useEffect(() => {
        const fetchTrendingClaims = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/community/trending-claims?limit=20');
                const data = await response.json();
                setClaims(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTrendingClaims();
    }, []);

    if (loading) return (
        <div className="trending-container">
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
                <p>Loading trending claims...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="trending-container">
            <p style={{ color: 'var(--danger)', padding: '40px 0' }}>⚠️ Error: {error}</p>
        </div>
    );

    return (
        <div className="trending-container">
            <h1>🔥 Trending Misinformation</h1>
            {claims.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>No Trending Claims Yet</h3>
                    <p>As users analyze news articles, trending misinformation will appear here.</p>
                </div>
            ) : (
                <div className="claims-list">
                    {claims.map((claim, idx) => (
                        <div key={idx} className="claim-card">
                            <div className="claim-rank">{idx + 1}</div>
                            <div className="claim-content">
                                <h3>{claim.claim_text}</h3>
                                <div className="claim-stats">
                                    <span className="occurrences">Seen {claim.occurrences} times</span>
                                    <span className="updated">Last updated: {new Date(claim.last_updated).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
