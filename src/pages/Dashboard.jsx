import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }
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

    const handleDelete = async (id) => {
        if (!confirm('Delete this analysis?')) return;
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
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (!user) return null;

    const verdictColors = {
        'Likely Credible': '#22c55e',
        'Needs Verification': '#f59e0b',
        'Suspicious': '#f97316',
        'Likely Fake': '#ef4444',
    };

    const verdictData = stats?.verdictBreakdown
        ? {
            labels: stats.verdictBreakdown.map(v => v.verdict),
            datasets: [{
                data: stats.verdictBreakdown.map(v => v.count),
                backgroundColor: stats.verdictBreakdown.map(v => verdictColors[v.verdict] || '#6366f1'),
                borderWidth: 0,
                borderRadius: 4,
            }],
        }
        : null;

    const distributionData = stats?.scoreDistribution
        ? {
            labels: stats.scoreDistribution.map(s => {
                const labels = { credible: 'Credible', needs_verification: 'Verify', suspicious: 'Suspicious', likely_fake: 'Fake' };
                return labels[s.category] || s.category;
            }),
            datasets: [{
                label: 'Articles',
                data: stats.scoreDistribution.map(s => s.count),
                backgroundColor: ['#22c55e88', '#f59e0b88', '#f9731688', '#ef444488'],
                borderColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'],
                borderWidth: 1,
                borderRadius: 6,
            }],
        }
        : null;

    function getScoreColor(s) {
        if (s >= 75) return 'var(--success)';
        if (s >= 50) return 'var(--warning)';
        if (s >= 30) return '#f97316';
        return 'var(--danger)';
    }

    function getVerdictBadge(v) {
        const map = {
            'Likely Credible': 'badge-success',
            'Needs Verification': 'badge-warning',
            'Suspicious': 'badge-warning',
            'Likely Fake': 'badge-danger',
        };
        return map[v] || 'badge-info';
    }

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header">
                <div>
                    <h1>📊 Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.username}!</p>
                </div>
                <Link to="/analyze" className="btn btn-primary">
                    🔍 New Analysis
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-stats">
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">📄</div>
                    <div className="dash-stat-value">{stats?.totalAnalyses || 0}</div>
                    <div className="dash-stat-label">Total Analyses</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">📈</div>
                    <div className="dash-stat-value" style={{ color: getScoreColor(stats?.avgScore || 0) }}>
                        {stats?.avgScore || 0}%
                    </div>
                    <div className="dash-stat-label">Avg Score</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">🚨</div>
                    <div className="dash-stat-value">{stats?.totalReports || 0}</div>
                    <div className="dash-stat-label">Reports Filed</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">🛡️</div>
                    <div className="dash-stat-value gradient-text">
                        {stats?.verdictBreakdown?.find(v => v.verdict === 'Likely Credible')?.count || 0}
                    </div>
                    <div className="dash-stat-label">Credible Found</div>
                </div>
            </div>

            {/* Charts + History */}
            <div className="dashboard-grid">
                {/* History */}
                <div className="dash-card">
                    <div className="dash-card-title">📋 Recent Analyses</div>
                    {history.length > 0 ? (
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Score</th>
                                    <th>Verdict</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr key={item.id}>
                                        <td className="history-title">{item.title || 'Untitled'}</td>
                                        <td>
                                            <span className="history-score" style={{ color: getScoreColor(item.overall_score) }}>
                                                {item.overall_score}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getVerdictBadge(item.verdict)}`}>
                                                {item.verdict}
                                            </span>
                                        </td>
                                        <td className="history-date">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDelete(item.id)}
                                                style={{ color: 'var(--danger)', padding: '4px 8px' }}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="history-empty">
                            <div className="history-empty-icon">📝</div>
                            <p>No analyses yet</p>
                            <Link to="/analyze" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-md)' }}>
                                Analyze Your First Article
                            </Link>
                        </div>
                    )}
                </div>

                {/* Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    <div className="dash-card">
                        <div className="dash-card-title">🍩 Verdict Distribution</div>
                        {verdictData ? (
                            <div className="chart-container" style={{ height: 200 }}>
                                <Doughnut
                                    data={verdictData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '65%',
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: { color: '#a0a0b8', padding: 12, font: { size: 11 } },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>No data yet</p>
                        )}
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-title">📊 Score Distribution</div>
                        {distributionData ? (
                            <div className="chart-container" style={{ height: 200 }}>
                                <Bar
                                    data={distributionData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                        },
                                        scales: {
                                            x: {
                                                ticks: { color: '#a0a0b8' },
                                                grid: { display: false },
                                            },
                                            y: {
                                                ticks: { color: '#a0a0b8', stepSize: 1 },
                                                grid: { color: 'rgba(255,255,255,0.05)' },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>No data yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
