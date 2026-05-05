import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Home() {
    const [stats, setStats] = useState(null);
    const [liveActivity, setLiveActivity] = useState([]);
    const [statsError, setStatsError] = useState('');
    const intervalRef = useRef(null);

    const loadStats = async () => {
        try {
            const data = await api.getStats();
            setStats(data);
            setStatsError('');
            if (data.recentAnalyses) {
                setLiveActivity(data.recentAnalyses.slice(-5).reverse());
            }
        } catch (e) {
            setStatsError('Live platform stats are temporarily unavailable.');
        }
    };

    useEffect(() => {
        loadStats();
        intervalRef.current = setInterval(loadStats, 30000);
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <div className="page-enter">
            {/* Hero Section */}
            <section className="hero container">
                <div className="hero-badge">
                    ✨ AI-Powered Credibility Analysis
                </div>
                <h1>
                    Detect <span className="gradient-text">Fake News</span><br />
                    Before It Spreads
                </h1>
                <p className="hero-subtitle">
                    Advanced multi-factor analysis engine that examines sentiment, source credibility,
                    language quality, and bias to give you an instant credibility score.
                </p>
                <div className="hero-actions">
                    <Link to="/analyze" className="btn btn-primary btn-lg">
                        🔍 Analyze News Now
                    </Link>
                    <Link to="/register" className="btn btn-secondary btn-lg">
                        Create Free Account
                    </Link>
                </div>

                {/* Hero Visual Preview */}
                <div className="hero-visual">
                    <div className="hero-card">
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-gradient)' }}></div>
                        <div className="hero-card-header">
                            <div className="hero-card-dot" style={{ background: '#ef4444' }}></div>
                            <div className="hero-card-dot" style={{ background: '#f59e0b' }}></div>
                            <div className="hero-card-dot" style={{ background: '#22c55e' }}></div>
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                VerifyNews Analysis Engine v2.0
                            </span>
                        </div>
                        <div className="hero-card-preview">
                            <div className="hero-mini-card">
                                <h4>Credibility Score</h4>
                                <div className="score" style={{ color: 'var(--success)' }}>87/100</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Likely Credible</div>
                            </div>
                            <div className="hero-mini-card">
                                <h4>Sentiment</h4>
                                <div className="score" style={{ color: 'var(--accent-primary)' }}>92/100</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Neutral Tone</div>
                            </div>
                            <div className="hero-mini-card">
                                <h4>Source Trust</h4>
                                <div className="score" style={{ color: 'var(--warning)' }}>78/100</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>reuters.com</div>
                            </div>
                            <div className="hero-mini-card">
                                <h4>Bias Level</h4>
                                <div className="score" style={{ color: 'var(--info)' }}>85/100</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Low Bias</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Strip */}
            <section className="container">
                {statsError && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{statsError}</div>}
                <div className="stats-strip">
                    {[
                        { number: stats ? stats.totalAnalyses.toLocaleString() : '0', label: 'Articles Analyzed' },
                        { number: stats ? stats.totalUsers.toLocaleString() : '0', label: 'Active Users' },
                        { number: '24', label: 'Source Database' },
                        { number: `${stats?.avgScore || 0}%`, label: 'Avg Credibility' },
                    ].map((stat, i) => (
                        <div className="stat-item" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="stat-number">{stat.number}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section container">
                <div className="section-header">
                    <h2>Powered by <span className="gradient-text">6 Analysis Factors</span></h2>
                    <p>Our engine examines multiple dimensions of every article to determine credibility</p>
                </div>
                <div className="features-grid">
                    {[
                        {
                            icon: '🎭',
                            title: 'Sentiment Analysis',
                            desc: 'Detects extreme emotional language that deviates from factual, neutral reporting standards.',
                        },
                        {
                            icon: '🪝',
                            title: 'Clickbait Detection',
                            desc: 'Identifies sensational headlines and manipulative phrases designed to generate clicks over substance.',
                        },
                        {
                            icon: '📝',
                            title: 'Language Quality',
                            desc: 'Evaluates grammar, vocabulary richness, and writing quality indicators of professional journalism.',
                        },
                        {
                            icon: '💔',
                            title: 'Emotional Manipulation',
                            desc: 'Checks for loaded words and fear-inducing language used to provoke emotional reactions.',
                        },
                        {
                            icon: '📑',
                            title: 'Source Attribution',
                            desc: 'Analyzes citation quality — credible articles cite specific, named sources rather than vague references.',
                        },
                        {
                            icon: '⚖️',
                            title: 'Bias Detection',
                            desc: 'Identifies political labeling, absolute statements, and one-sided framing that indicates bias.',
                        },
                    ].map((feature, i) => (
                        <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="how-section container">
                <div className="section-header">
                    <h2>How It <span className="gradient-text">Works</span></h2>
                    <p>Three simple steps to verify any news article</p>
                </div>
                <div className="how-steps">
                    {[
                        { num: 1, title: 'Paste Your Article', desc: 'Copy and paste the article text or enter a URL for automatic extraction.' },
                        { num: 2, title: 'AI Analysis', desc: 'Our engine runs 6 independent analysis factors on the content simultaneously.' },
                        { num: 3, title: 'Get Results', desc: 'Receive a detailed credibility score with per-factor breakdown and verdict.' },
                    ].map((step, i) => (
                        <div className="how-step" key={i} style={{ animationDelay: `${i * 0.2}s` }}>
                            <div className="step-number">{step.num}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Live Activity Feed */}
            {liveActivity.length > 0 && (
                <section className="container" style={{ marginBottom: 'var(--space-xxl)' }}>
                    <div className="section-header">
                        <h2>📡 Live <span className="gradient-text">Activity</span></h2>
                        <p>Real-time analysis activity from the community · Updates every 30 seconds</p>
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-lg)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LIVE — {liveActivity.length} recent analyses</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {liveActivity.map((activity, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                                    borderLeft: '3px solid var(--accent-primary)', gap: 'var(--space-md)'
                                }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        📰 {activity.date}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22c55e', minWidth: 60, textAlign: 'right' }}>
                                        +{activity.count} checks
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                            <Link to="/leaderboard" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                                View Full Leaderboard →
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* CTA */}
            <section className="cta-section container">
                <div className="cta-card">
                    <h2>Ready to Fight <span className="gradient-text">Misinformation</span>?</h2>
                    <p>Start analyzing news articles for free. No credit card required.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/analyze" className="btn btn-primary btn-lg" style={{ position: 'relative' }}>
                            🚀 Start Analyzing for Free
                        </Link>
                        <Link to="/leaderboard" className="btn btn-secondary btn-lg">
                            🏆 View Leaderboard
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
