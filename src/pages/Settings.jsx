import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import '../styles/Settings.css';

const getToken = () => localStorage.getItem('verifynews_token');

export default function Settings() {
    const [activeTab, setActiveTab] = useState('api');
    const [apiKeys, setApiKeys] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (activeTab === 'api') fetchApiKeys();
        if (activeTab === 'webhooks') fetchWebhooks();
        if (activeTab === 'alerts') fetchSubscriptions();
    }, [activeTab]);

    const fetchApiKeys = async () => {
        try {
            const response = await fetch('/api/features/api-keys', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            setApiKeys(await response.json());
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const fetchWebhooks = async () => {
        try {
            const response = await fetch('/api/features/webhooks', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            setWebhooks(await response.json());
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch('/api/features/subscriptions', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            setSubscriptions(await response.json());
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleGenerateApiKey = async () => {
        if (!newKeyName.trim()) {
            alert('Please enter a key name');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/features/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ name: newKeyName })
            });

            if (response.ok) {
                const newKey = await response.json();
                alert(`API Key: ${newKey.key}\n\nSave this securely - you won't see it again!`);
                setNewKeyName('');
                fetchApiKeys();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWebhook = async () => {
        if (!newWebhookUrl.trim() || selectedEvents.length === 0) {
            alert('Please enter URL and select events');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/features/webhooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    url: newWebhookUrl,
                    eventTypes: selectedEvents
                })
            });

            if (response.ok) {
                alert('Webhook registered successfully!');
                setNewWebhookUrl('');
                setSelectedEvents([]);
                fetchWebhooks();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeKey = async (keyId) => {
        if (confirm('Are you sure? This API key will be permanently revoked.')) {
            try {
                await fetch(`/api/features/api-keys/${keyId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                fetchApiKeys();
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        }
    };

    return (
        <div className="settings-container">
            <h1>⚙️ Settings & Integrations</h1>

            <div className="settings-tabs">
                <button 
                    className={`tab ${activeTab === 'api' ? 'active' : ''}`}
                    onClick={() => setActiveTab('api')}
                >
                    🔑 API Keys
                </button>
                <button 
                    className={`tab ${activeTab === 'webhooks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('webhooks')}
                >
                    🪝 Webhooks
                </button>
                <button 
                    className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alerts')}
                >
                    📧 Email Alerts
                </button>
            </div>

            {activeTab === 'api' && (
                <div className="api-section">
                    <h2>Generate API Keys</h2>
                    <div className="key-form">
                        <input
                            type="text"
                            placeholder="Key name (e.g., 'Mobile App')"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                        />
                        <button onClick={handleGenerateApiKey} disabled={loading}>
                            Generate Key
                        </button>
                    </div>
                    <h3>Your API Keys</h3>
                    <div className="keys-list">
                        {apiKeys.map(key => (
                            <div key={key.id} className="key-card">
                                <div>
                                    <strong>{key.name}</strong>
                                    <small>Created: {new Date(key.created_at).toLocaleDateString()}</small>
                                </div>
                                <button 
                                    onClick={() => handleRevokeKey(key.id)}
                                    className="btn-danger"
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'webhooks' && (
                <div className="webhooks-section">
                    <h2>Register Webhooks</h2>
                    <div className="webhook-form">
                        <input
                            type="url"
                            placeholder="Webhook URL"
                            value={newWebhookUrl}
                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                        />
                        <div className="event-checkboxes">
                            {['analysis_completed', 'comment_added', 'media_analyzed'].map(event => (
                                <label key={event}>
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedEvents([...selectedEvents, event]);
                                            } else {
                                                setSelectedEvents(selectedEvents.filter(e => e !== event));
                                            }
                                        }}
                                    />
                                    {event}
                                </label>
                            ))}
                        </div>
                        <button onClick={handleAddWebhook} disabled={loading}>
                            Register Webhook
                        </button>
                    </div>
                    <h3>Your Webhooks</h3>
                    <div className="webhooks-list">
                        {webhooks.map(webhook => (
                            <div key={webhook.id} className="webhook-card">
                                <strong>{webhook.url}</strong>
                                <small>{webhook.event_types}</small>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="alerts-section">
                    <h2>Email Notifications</h2>
                    <div className="subscription-list">
                        {['trending_claims', 'new_reports', 'community_activity'].map(type => (
                            <div key={type} className="subscription-item">
                                <label>
                                    <input 
                                        type="checkbox"
                                        defaultChecked={subscriptions.some(s => s.subscription_type === type && s.enabled)}
                                    />
                                    {type === 'trending_claims' && '🔥 Get alerts about trending misinformation'}
                                    {type === 'new_reports' && '📰 Get notified about new community reports'}
                                    {type === 'community_activity' && '👥 Get alerts about community discussions'}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
