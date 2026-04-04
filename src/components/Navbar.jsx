import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path) => location.pathname === path ? 'active' : '';

    const closeMobile = () => setMobileOpen(false);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-logo" onClick={closeMobile}>
                    <div className="navbar-logo-icon">🛡️</div>
                    <span>Verify<span className="gradient-text">News</span></span>
                </Link>

                <div className="navbar-links">
                    <Link to="/" className={`nav-link ${isActive('/')}`}>🏠 Home</Link>
                    <Link to="/analyze" className={`nav-link ${isActive('/analyze')}`}>🔍 Analyze</Link>
                    <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>🏆 Leaderboard</Link>
                    {user && (
                        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>📊 Dashboard</Link>
                    )}
                    <Link to="/report" className={`nav-link ${isActive('/report')}`}>🚨 Report</Link>
                    <Link to="/about" className={`nav-link ${isActive('/about')}`}>ℹ️ About</Link>
                </div>

                <div className="navbar-auth">
                    {user ? (
                        <div className="navbar-user-menu">
                            <div
                                className="navbar-avatar"
                                style={{ backgroundColor: user.avatar_color || '#6366f1' }}
                                onClick={() => setShowDropdown(!showDropdown)}
                            >
                                {user.username?.charAt(0).toUpperCase()}
                            </div>
                            {showDropdown && (
                                <div className="navbar-dropdown">
                                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                    </div>
                                    <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setShowDropdown(false)}>
                                        📊 Dashboard
                                    </Link>
                                    <Link to="/leaderboard" className="navbar-dropdown-item" onClick={() => setShowDropdown(false)}>
                                        🏆 Leaderboard
                                    </Link>
                                    <button
                                        className="navbar-dropdown-item"
                                        onClick={() => { logout(); setShowDropdown(false); }}
                                        style={{ color: 'var(--danger)' }}
                                    >
                                        🚪 Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost">Log in</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
                        </>
                    )}
                </div>

                <button className="navbar-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
                    {mobileOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div style={{
                    background: 'rgba(15,23,42,0.98)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid var(--border-color)',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                }}>
                    {[
                        { to: '/', label: '🏠 Home' },
                        { to: '/analyze', label: '🔍 Analyze' },
                        { to: '/leaderboard', label: '🏆 Leaderboard' },
                        ...(user ? [{ to: '/dashboard', label: '📊 Dashboard' }] : []),
                        { to: '/report', label: '🚨 Report' },
                        { to: '/about', label: 'ℹ️ About' },
                    ].map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${isActive(link.to)}`}
                            onClick={closeMobile}
                            style={{ padding: '10px 12px', borderRadius: 8 }}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {user ? (
                        <button className="btn btn-ghost" onClick={() => { logout(); closeMobile(); }} style={{ color: 'var(--danger)', marginTop: 4 }}>
                            🚪 Logout
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <Link to="/login" className="btn btn-ghost" style={{ flex: 1, textAlign: 'center' }} onClick={closeMobile}>Log in</Link>
                            <Link to="/register" className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }} onClick={closeMobile}>Sign up</Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}

export default Navbar;
