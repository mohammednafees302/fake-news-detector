import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, authLoading]);

    const loadData = async () => {
        try {
            const [userStats, historyData] = await Promise.all([
                api.getUserStats(),
                api.getHistory(1),
            ]);
            setStats(userStats);
            setHistory(historyData.analyses || []);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Remove this analysis from your history?')) return;
        try {
            await api.deleteAnalysis(id);
            setHistory(h => h.filter(a => a.id !== id));
            loadData();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    if (authLoading || loading) {
        return (
            <div style={s.center}>
                <div className="spinner" style={{ marginBottom: 16 }}></div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading profile...</p>
            </div>
        );
    }

    if (!user) return null;

    const total = stats?.totalAnalyses || 0;
    const avg = stats?.avgScore || 0;
    
    const badges = [];
    if (total >= 1) badges.push({ icon: '🌱', name: 'Novice' });
    if (total >= 5) badges.push({ icon: '🔍', name: 'Investigator' });
    if (total >= 10) badges.push({ icon: '🛡️', name: 'Guardian' });
    if (avg >= 80 && total >= 3) badges.push({ icon: '🎯', name: 'High Accuracy' });

    function getScoreColor(score) {
        if (score >= 75) return '#22c55e';
        if (score >= 50) return '#f59e0b';
        if (score >= 30) return '#f97316';
        return '#ef4444';
    }

    const verdictColors = {
        'Likely Credible': '#22c55e',
        'Needs Verification': '#f59e0b',
        'Suspicious': '#f97316',
        'Likely Fake': '#ef4444',
    };

    return (
        <div style={s.page}>
            <div style={s.container}>
                
                {/* Compact Horizontal Profile Header */}
                <div style={s.profileHeader}>
                    <div style={s.profileLeft}>
                        <div style={s.avatar}>
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={s.userInfo}>
                            <h1 style={s.username}>{user.username}</h1>
                            <p style={s.email}>{user.email}</p>
                            
                            <div style={s.badgeRow}>
                                {badges.length > 0 ? (
                                    badges.map(b => (
                                        <span key={b.name} style={s.badge}>
                                            <span style={{ marginRight: 4 }}>{b.icon}</span> {b.name}
                                        </span>
                                    ))
                                ) : (
                                    <span style={s.badge}>No badges yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div style={s.statsRow}>
                        <div style={s.statBlock}>
                            <div style={s.statValue}>{total}</div>
                            <div style={s.statLabel}>Analyses</div>
                        </div>
                        <div style={s.statDivider}></div>
                        <div style={s.statBlock}>
                            <div style={{...s.statValue, color: getScoreColor(avg)}}>{avg}%</div>
                            <div style={s.statLabel}>Avg Trust</div>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div style={s.layout}>
                    
                    {/* Left Column: Feed */}
                    <div style={s.feedColumn}>
                        <div style={s.feedHeader}>
                            <h2 style={s.sectionTitle}>Reading & Analysis History</h2>
                            <Link to="/analyze" style={s.newBtn}>+ New Analysis</Link>
                        </div>
                        
                        <div style={s.feedList}>
                            {history.length > 0 ? (
                                history.map(item => (
                                    <div key={item.id} style={s.feedItem}>
                                        <div style={s.itemMeta}>
                                            <span style={s.itemDate}>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <span style={s.dot}>•</span>
                                            <span style={{...s.itemVerdict, color: verdictColors[item.verdict]}}>
                                                {item.verdict}
                                            </span>
                                            <span style={s.dot}>•</span>
                                            <span style={{...s.itemScore, color: getScoreColor(item.overall_score)}}>
                                                Score: {item.overall_score}
                                            </span>
                                        </div>
                                        
                                        <Link to={`/analyze/${item.id}`} style={s.itemTitle}>
                                            {item.title || item.url || 'Untitled Document Analysis'}
                                        </Link>
                                        
                                        <div style={s.itemActions}>
                                            <Link to={`/analyze/${item.id}`} style={s.readLink}>View Full Report</Link>
                                            <button onClick={(e) => handleDelete(item.id, e)} style={s.deleteBtn}>Delete</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={s.emptyState}>
                                    <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.5 }}>📝</div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Your reading list is empty</h3>
                                    <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Analyze news articles to start building your history.</p>
                                    <Link to="/analyze" style={s.readLink}>Go to Analyzer →</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div style={s.sidebar}>
                        <div style={s.sidebarBlock}>
                            <h3 style={s.sidebarTitle}>About Trust Scores</h3>
                            <p style={s.sidebarText}>
                                Your average trust score reflects the general credibility of the media you consume and analyze. A higher score indicates a habit of reading well-sourced, verified information.
                            </p>
                        </div>

                        <div style={s.sidebarBlock}>
                            <h3 style={s.sidebarTitle}>Community Quick Links</h3>
                            <ul style={s.linkList}>
                                <li><Link to="/community" style={s.sidebarLink}>Active Discussions</Link></li>
                                <li><Link to="/trending" style={s.sidebarLink}>Trending Misinformation</Link></li>
                                <li><Link to="/learn" style={s.sidebarLink}>Learning Center</Link></li>
                                <li><Link to="/leaderboard" style={s.sidebarLink}>Top Fact-Checkers</Link></li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

/* ── Refined & Compact Styles ───────────────────────────── */
const s = {
    page: { 
        minHeight: '100vh', 
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-family)'
    },
    center: { 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', minHeight: '60vh' 
    },
    container: { 
        maxWidth: 1000, 
        margin: '0 auto', 
        padding: '40px 24px' 
    },

    /* Profile Header */
    profileHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 32,
        marginBottom: 32,
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: 24
    },
    profileLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 20
    },
    avatar: {
        width: 64, height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem', fontWeight: 800, color: '#fff',
        boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
    },
    userInfo: {
        display: 'flex', flexDirection: 'column', gap: 4
    },
    username: {
        margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em'
    },
    email: {
        margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)'
    },
    badgeRow: {
        display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap'
    },
    badge: {
        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
        background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 6,
        border: '1px solid var(--border-color)'
    },

    statsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 24
    },
    statBlock: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
    },
    statValue: {
        fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1
    },
    statLabel: {
        fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em'
    },
    statDivider: {
        width: 1, height: 30, background: 'var(--border-color)'
    },

    /* Main Layout */
    layout: {
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 60,
        alignItems: 'start'
    },

    /* Feed Column */
    feedColumn: {
        display: 'flex', flexDirection: 'column'
    },
    feedHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24
    },
    sectionTitle: {
        margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)'
    },
    newBtn: {
        fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)',
        textDecoration: 'none', background: 'rgba(99,102,241,0.1)', 
        padding: '6px 12px', borderRadius: 999
    },
    
    feedList: {
        display: 'flex', flexDirection: 'column'
    },
    feedItem: {
        padding: '24px 0',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', gap: 8
    },
    itemMeta: {
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)'
    },
    dot: { fontSize: '0.6rem', opacity: 0.5 },
    itemVerdict: { fontWeight: 600 },
    itemScore: { fontWeight: 500 },
    
    itemTitle: {
        fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)',
        textDecoration: 'none', lineHeight: 1.4, margin: '4px 0',
        transition: 'color 0.2s'
    },
    itemActions: {
        display: 'flex', alignItems: 'center', gap: 16, marginTop: 8
    },
    readLink: {
        fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none',
        fontWeight: 500, transition: 'color 0.2s'
    },
    deleteBtn: {
        background: 'none', border: 'none', color: '#ef4444', opacity: 0.7,
        fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: 500
    },

    emptyState: {
        padding: '40px 0', textAlign: 'center', borderTop: '1px solid var(--border-color)'
    },

    /* Sidebar Column */
    sidebar: {
        display: 'flex', flexDirection: 'column', gap: 40
    },
    sidebarBlock: {
        display: 'flex', flexDirection: 'column', gap: 12
    },
    sidebarTitle: {
        margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em'
    },
    sidebarText: {
        margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6
    },
    linkList: {
        listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12
    },
    sidebarLink: {
        color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'color 0.2s'
    }
};

const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .feedItem:hover .itemTitle { color: var(--accent-primary) !important; }
  .readLink:hover { color: var(--text-primary) !important; }
  .deleteBtn:hover { opacity: 1 !important; }
  .sidebarLink:hover { color: var(--accent-primary) !important; }
  @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr !important; gap: 40px !important; }
    .profileHeader { flex-direction: column; align-items: flex-start !important; }
  }
`;
document.head.appendChild(styleTag);
