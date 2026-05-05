import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import '../styles/PublisherDashboard.css';

const getToken = () => localStorage.getItem('verifynews_token');

export default function PublisherDashboard() {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [publisherName, setPublisherName] = useState('');
    const [domain, setDomain] = useState('');
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchPublisherProfile();
    }, []);

    const fetchPublisherProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/features/publisher-profile', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setPublisherName(data?.publisher_name || '');
                setDomain(data?.domain || '');
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProfile = async () => {
        if (!publisherName.trim() || !domain.trim()) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/api/features/publisher-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ publisherName, domain })
            });

            if (response.ok) {
                alert('Publisher profile created!');
                fetchPublisherProfile();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) return <div className="publisher-container"><p>Loading...</p></div>;

    return (
        <div className="publisher-container">
            <h1>📰 Publisher Dashboard</h1>

            {!profile ? (
                <div className="profile-form">
                    <h2>Create Publisher Profile</h2>
                    <input
                        type="text"
                        placeholder="Publisher Name"
                        value={publisherName}
                        onChange={(e) => setPublisherName(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Domain (e.g., example.com)"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                    />
                    <button onClick={handleCreateProfile}>Create Profile</button>
                </div>
            ) : (
                <div className="profile-info">
                    <h2>{profile.publisher_name}</h2>
                    <p>Domain: {profile.domain}</p>
                    <div className="stats">
                        <div className="stat-card">
                            <h3>Accuracy Score</h3>
                            <p className="stat-value">{profile.accuracy_score}%</p>
                        </div>
                        <div className="stat-card">
                            <h3>Total Articles Analyzed</h3>
                            <p className="stat-value">0</p>
                        </div>
                        <div className="stat-card">
                            <h3>Credibility Rating</h3>
                            <p className="stat-value">⭐⭐⭐</p>
                        </div>
                    </div>
                    <h3>Recent Articles</h3>
                    <p>No articles analyzed yet.</p>
                </div>
            )}
        </div>
    );
}
