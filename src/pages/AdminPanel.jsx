import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    Legend,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, CategoryScale, Legend, LinearScale, BarElement, Title, Tooltip);

function AdminPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingReportId, setSavingReportId] = useState('');
    const [deletingReportId, setDeletingReportId] = useState('');
    const [deletingUserId, setDeletingUserId] = useState('');
    const [savingUserRoleId, setSavingUserRoleId] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        reportStatus: 'all',
        userRole: 'all',
    });

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async (nextFilters = filters) => {
        try {
            setLoading(true);
            const adminData = await api.getAdminOverview(nextFilters);
            setData(adminData);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = async (e) => {
        e.preventDefault();
        await loadAdminData(filters);
    };

    const handleStatusChange = async (reportId, status) => {
        try {
            setSavingReportId(reportId);
            await api.updateReportStatus(reportId, status);
            await loadAdminData();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingReportId('');
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!confirm('Delete this report permanently?')) return;
        try {
            setDeletingReportId(reportId);
            await api.deleteReportAdmin(reportId);
            await loadAdminData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingReportId('');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Delete this user account permanently?')) return;
        try {
            setDeletingUserId(userId);
            await api.deleteUserAdmin(userId);
            await loadAdminData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingUserId('');
        }
    };

    const handleRoleChange = async (userId, isAdmin) => {
        try {
            setSavingUserRoleId(userId);
            await api.updateUserRoleAdmin(userId, isAdmin);
            await loadAdminData();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingUserRoleId('');
        }
    };

    const verdictChartData = data?.verdictBreakdown
        ? {
            labels: data.verdictBreakdown.map((item) => item.verdict),
            datasets: [{
                data: data.verdictBreakdown.map((item) => item.count),
                backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444', '#6366f1'],
                borderWidth: 0,
            }],
        }
        : null;

    const moderationChartData = data
        ? {
            labels: ['Pending', 'Reviewed', 'Resolved'],
            datasets: [{
                label: 'Reports',
                data: [
                    data.summary.pendingReports || 0,
                    data.summary.reviewedReports || 0,
                    data.summary.resolvedReports || 0,
                ],
                backgroundColor: ['#38bdf8aa', '#f59e0baa', '#22c55eaa'],
                borderColor: ['#38bdf8', '#f59e0b', '#22c55e'],
                borderWidth: 1,
                borderRadius: 8,
            }],
        }
        : null;

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '60vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Loading admin panel...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header">
                <div>
                    <h1>Admin Panel</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage users, reports, roles, and platform analytics.</p>
                </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 'var(--space-lg)' }}>{error}</div>}

            <form className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }} onSubmit={handleFilterSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-md)', alignItems: 'end' }}>
                    <div className="input-group">
                        <label htmlFor="admin-search">Search</label>
                        <input
                            id="admin-search"
                            className="input-field"
                            placeholder="Search users, emails, reports, or analyses"
                            value={filters.search}
                            onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="admin-report-status">Report Status</label>
                        <select
                            id="admin-report-status"
                            className="input-field"
                            value={filters.reportStatus}
                            onChange={(e) => setFilters((current) => ({ ...current, reportStatus: e.target.value }))}
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label htmlFor="admin-user-role">User Role</label>
                        <select
                            id="admin-user-role"
                            className="input-field"
                            value={filters.userRole}
                            onChange={(e) => setFilters((current) => ({ ...current, userRole: e.target.value }))}
                        >
                            <option value="all">All</option>
                            <option value="admin">Admins</option>
                            <option value="user">Users</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary">Apply</button>
                </div>
            </form>

            <div className="dashboard-stats">
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">Users</div>
                    <div className="dash-stat-value">{data?.summary.totalUsers || 0}</div>
                    <div className="dash-stat-label">Registered Users</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">Admins</div>
                    <div className="dash-stat-value">{data?.summary.totalAdmins || 0}</div>
                    <div className="dash-stat-label">Admin Accounts</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">Pending</div>
                    <div className="dash-stat-value">{data?.summary.pendingReports || 0}</div>
                    <div className="dash-stat-label">Pending Reports</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon">Checks</div>
                    <div className="dash-stat-value">{data?.summary.totalAnalyses || 0}</div>
                    <div className="dash-stat-label">Total Analyses</div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dash-card">
                    <div className="dash-card-title">Analysis Verdicts</div>
                    {verdictChartData ? (
                        <div className="chart-container" style={{ height: 240 }}>
                            <Doughnut
                                data={verdictChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: '#a0a0b8', padding: 14 },
                                        },
                                    },
                                }}
                            />
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No verdict data available.</p>
                    )}
                </div>

                <div className="dash-card">
                    <div className="dash-card-title">Report Moderation Flow</div>
                    {moderationChartData ? (
                        <div className="chart-container" style={{ height: 240 }}>
                            <Bar
                                data={moderationChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
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
                        <p style={{ color: 'var(--text-muted)' }}>No moderation data available.</p>
                    )}
                </div>
            </div>

            <div className="dash-card" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="dash-card-title">User Management</div>
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.recentUsers || []).map((user) => (
                            <tr key={user.id}>
                                <td className="history-title">{user.username}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`badge ${user.is_admin ? 'badge-danger' : 'badge-info'}`}>
                                        {user.is_admin ? 'Admin' : 'User'}
                                    </span>
                                </td>
                                <td className="history-date">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                            className="input-field"
                                            style={{ minWidth: 120 }}
                                            value={user.is_admin ? 'admin' : 'user'}
                                            disabled={savingUserRoleId === user.id}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value === 'admin')}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            disabled={deletingUserId === user.id}
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dashboard-grid" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="dash-card">
                    <div className="dash-card-title">Recent Analyses</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {(data?.recentAnalyses || []).map((analysis) => (
                            <div key={analysis.id} className="glass-card" style={{ padding: 'var(--space-md)' }}>
                                <div style={{ fontWeight: 600 }}>{analysis.title || 'Untitled'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {analysis.email || 'Guest'} · {analysis.verdict} · {analysis.overall_score}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dash-card">
                    <div className="dash-card-title">Report Moderation</div>
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Reporter</th>
                                <th>Votes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.recentReports || []).map((report) => (
                                <tr key={report.id}>
                                    <td className="history-title">{report.title}</td>
                                    <td>
                                        <span className={`badge ${report.status === 'resolved' ? 'badge-success' : report.status === 'reviewed' ? 'badge-warning' : 'badge-info'}`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td>{report.username || 'Unknown'}</td>
                                    <td>{report.upvotes || 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <select
                                                className="input-field"
                                                style={{ minWidth: 130 }}
                                                value={report.status}
                                                disabled={savingReportId === report.id}
                                                onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="reviewed">Reviewed</option>
                                                <option value="resolved">Resolved</option>
                                            </select>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                disabled={deletingReportId === report.id}
                                                onClick={() => handleDeleteReport(report.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminPanel;
