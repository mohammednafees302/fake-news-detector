import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function Report() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '',
        url: '',
        description: '',
        category: 'misinformation',
    });

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const data = await api.getReports();
            setReports(data.reports || []);
        } catch (err) {
            console.error('Load reports error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!user) {
            setError('Please log in to submit a report.');
            return;
        }

        if (!form.title || !form.description) {
            setError('Title and description are required.');
            return;
        }

        setSubmitting(true);
        try {
            await api.submitReport(form);
            setSuccess('Report submitted successfully! Thank you for helping fight misinformation.');
            setForm({ title: '', url: '', description: '', category: 'misinformation' });
            loadReports();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpvote = async (id) => {
        if (!user) return;
        try {
            await api.upvoteReport(id);
            setReports(reports.map(r =>
                r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r
            ));
        } catch (err) {
            console.error('Upvote error:', err);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString();
    };

    const categoryColors = {
        misinformation: '#ef4444',
        disinformation: '#dc2626',
        satire: '#f59e0b',
        clickbait: '#f97316',
        propaganda: '#a855f7',
        scam: '#ec4899',
        other: '#6366f1',
    };

    return (
        <div className="report-page container">
            <div className="report-header">
                <h1>🚨 Community <span className="gradient-text">Reports</span></h1>
                <p>Help the community by reporting fake news you've encountered</p>
            </div>

            <div className="report-layout">
                {/* Submit Form */}
                <div className="report-form-card glass-card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>📝 Submit a Report</h3>

                    {!user && (
                        <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>
                            Please <a href="/login" style={{ color: 'var(--accent-primary)' }}>log in</a> to submit reports.
                        </div>
                    )}

                    {success && (
                        <div style={{
                            padding: '12px',
                            background: 'var(--success-bg)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--success)',
                            fontSize: '0.9rem',
                            marginBottom: 'var(--space-md)',
                        }}>
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>
                    )}

                    <form className="report-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Report Title</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Brief title describing the fake news"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>URL (optional)</label>
                            <input
                                type="url"
                                className="input-field"
                                placeholder="https://example.com/fake-article"
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                            />
                        </div>

                        <div className="input-group">
                            <label>Category</label>
                            <select
                                className="input-field"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                            >
                                <option value="misinformation">Misinformation</option>
                                <option value="disinformation">Disinformation</option>
                                <option value="satire">Satire Shared as Truth</option>
                                <option value="clickbait">Clickbait</option>
                                <option value="propaganda">Propaganda</option>
                                <option value="scam">Scam</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Description</label>
                            <textarea
                                className="input-field"
                                placeholder="Describe why you believe this is fake news. Include any evidence or context..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                required
                                rows={5}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={submitting || !user}>
                            {submitting ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                    Submitting...
                                </>
                            ) : (
                                '🚨 Submit Report'
                            )}
                        </button>
                    </form>
                </div>

                {/* Reports Feed */}
                <div className="reports-feed-card glass-card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>📰 Recent Reports</h3>

                    {loading ? (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                        </div>
                    ) : reports.length > 0 ? (
                        reports.map((report) => (
                            <div className="report-item" key={report.id}>
                                <div className="report-item-header">
                                    <div className="report-item-title">{report.title}</div>
                                    <span
                                        className="report-item-category"
                                        style={{ color: categoryColors[report.category] || '#6366f1' }}
                                    >
                                        {report.category}
                                    </span>
                                </div>
                                <div className="report-item-desc">
                                    {report.description.length > 120
                                        ? report.description.substring(0, 120) + '...'
                                        : report.description}
                                </div>
                                {report.url && (
                                    <a
                                        href={report.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '8px' }}
                                    >
                                        🔗 View article
                                    </a>
                                )}
                                <div className="report-item-footer">
                                    <span>
                                        {report.username && (
                                            <>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: '50%',
                                                        background: report.avatar_color || '#6366f1',
                                                        color: 'white',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 700,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 4,
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    {report.username.charAt(0).toUpperCase()}
                                                </span>
                                                {report.username}
                                            </>
                                        )}
                                        {' · '}{formatDate(report.created_at)}
                                    </span>
                                    <button
                                        className="report-upvote"
                                        onClick={() => handleUpvote(report.id)}
                                        disabled={!user}
                                    >
                                        👍 {report.upvotes}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="history-empty">
                            <div className="history-empty-icon">📭</div>
                            <p>No reports yet. Be the first to report fake news!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Report;
