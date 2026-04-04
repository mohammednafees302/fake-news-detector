import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Leaderboard() {
    const [stats, setStats] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reports');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, reportsData] = await Promise.all([
                    api.getStats(),
                    api.getReports(1),
                ]);
                setStats(statsData);
                setReports(reportsData.reports || []);
            } catch (err) {
                console.error('Leaderboard load error:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Loading leaderboard...</p>
            </div>
        );
    }

    const credibleSources = stats?.topSources?.filter(s => s.credibility_score >= 80) || [];
    const warningSources = stats?.topSources?.filter(s => s.credibility_score < 50) || [];

    const getBiasColor = (bias) => {
        const map = {
            'far-left': '#ef4444', 'left': '#f97316', 'center-left': '#f59e0b',
            'center': '#22c55e', 'center-right': '#3b82f6', 'right': '#8b5cf6',
            'far-right': '#ec4899',
        };
        return map[bias] || '#6b7280';
    };

    return (
        <div className="leaderboard-page container page-enter">
            {/* Header */}
            <div className="analyzer-header">
                <h1>🏆 Community <span className="gradient-text">Leaderboard</span></h1>
                <p>Crowdsourced fake news reports ranked by the community · No login required</p>
            </div>

            {/* Platform Stats Strip */}
            <div className="stats-strip" style={{ marginBottom: 'var(--space-xl)' }}>
                {[
                    { number: stats?.totalAnalyses?.toLocaleString() || '0', label: 'Articles Analyzed' },
                    { number: stats?.totalUsers?.toLocaleString() || '0', label: 'Active Users' },
                    { number: stats?.totalReports?.toLocaleString() || '0', label: 'Reports Filed' },
                    { number: `${stats?.avgScore || 0}%`, label: 'Avg Credibility' },
                ].map((s, i) => (
                    <div className="stat-item" key={i}>
                        <div className="stat-number">{s.number}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="analyzer-tabs" style={{ marginBottom: 'var(--space-xl)' }}>
                <button className={`analyzer-tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                    🚨 Top Community Reports
                </button>
                <button className={`analyzer-tab ${activeTab === 'trusted' ? 'active' : ''}`} onClick={() => setActiveTab('trusted')}>
                    ✅ Trusted Sources
                </button>
                <button className={`analyzer-tab ${activeTab === 'flagged' ? 'active' : ''}`} onClick={() => setActiveTab('flagged')}>
                    ⚠️ Flagged Sources
                </button>
            </div>

            {/* Community Reports Tab */}
            {activeTab === 'reports' && (
                <div>
                    {reports.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {reports.map((report, i) => (
                                <div key={report.id} className="glass-card" style={{ padding: 'var(--space-lg)', display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: 48, height: 48, borderRadius: 12,
                                        background: 'var(--accent-gradient)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '1.1rem', color: 'white'
                                    }}>
                                        #{i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 6 }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>{report.title}</h3>
                                            <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>{report.category}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 8px' }}>{report.description}</p>
                                        {report.url && (
                                            <a href={report.url} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                                                🔗 {report.url.substring(0, 60)}...
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: 64 }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                            {report.upvotes || 0}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>upvotes</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 'var(--space-xxl)', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📭</div>
                            <h3>No reports yet</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Be the first to report a suspicious article!</p>
                            <Link to="/report" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
                                🚨 File a Report
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Trusted Sources Tab */}
            {activeTab === 'trusted' && (
                <div className="factors-grid">
                    {credibleSources.map((source, i) => (
                        <div key={i} className="factor-card glass-card">
                            <div className="factor-header">
                                <div className="factor-name">
                                    <span>✅</span>
                                    <span>{source.name}</span>
                                </div>
                                <div className="factor-score" style={{ color: '#22c55e' }}>
                                    {source.credibility_score}/100
                                </div>
                            </div>
                            <div className="factor-bar">
                                <div className="factor-bar-fill" style={{
                                    width: `${source.credibility_score}%`,
                                    background: 'linear-gradient(90deg, #22c55e, #86efac)'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{source.domain}</span>
                                <span style={{
                                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6,
                                    background: `${getBiasColor(source.bias)}22`, color: getBiasColor(source.bias)
                                }}>
                                    {source.bias}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Flagged Sources Tab */}
            {activeTab === 'flagged' && (
                <div className="factors-grid">
                    {warningSources.map((source, i) => (
                        <div key={i} className="factor-card glass-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                            <div className="factor-header">
                                <div className="factor-name">
                                    <span>⚠️</span>
                                    <span>{source.name}</span>
                                </div>
                                <div className="factor-score" style={{ color: '#ef4444' }}>
                                    {source.credibility_score}/100
                                </div>
                            </div>
                            <div className="factor-bar">
                                <div className="factor-bar-fill" style={{
                                    width: `${source.credibility_score}%`,
                                    background: 'linear-gradient(90deg, #ef4444, #fca5a5)'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{source.domain}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{source.category}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA */}
            <div className="cta-section" style={{ marginTop: 'var(--space-xxl)' }}>
                <div className="cta-card" style={{ textAlign: 'center' }}>
                    <h2>Spotted Fake News? <span className="gradient-text">Report It.</span></h2>
                    <p>Help the community by reporting suspicious articles. Your report will be reviewed and ranked here.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-lg)' }}>
                        <Link to="/report" className="btn btn-primary btn-lg">🚨 File a Report</Link>
                        <Link to="/analyze" className="btn btn-secondary btn-lg">🔍 Analyze an Article</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;
