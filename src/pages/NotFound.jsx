import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const quickLinks = [
    { to: '/',           emoji: '🏠', label: 'Home',        desc: 'Back to the homepage' },
    { to: '/analyze',    emoji: '🔍', label: 'Analyze',     desc: 'Check a news article' },
    { to: '/trending',   emoji: '🔥', label: 'Trending',    desc: 'See trending claims' },
    { to: '/community',  emoji: '👥', label: 'Community',   desc: 'Join the discussion' },
    { to: '/learn',      emoji: '🎓', label: 'Learn',       desc: 'Media literacy guides' },
    { to: '/leaderboard',emoji: '🏆', label: 'Leaderboard', desc: 'Top contributors' },
];

function NotFound() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/analyze?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <div style={styles.page}>
            {/* Animated background orbs */}
            <div style={{ ...styles.orb, ...styles.orb1 }} />
            <div style={{ ...styles.orb, ...styles.orb2 }} />
            <div style={{ ...styles.orb, ...styles.orb3 }} />

            <div style={styles.content}>
                {/* Floating icon */}
                <div style={styles.iconWrapper}>
                    <div style={styles.iconRing} />
                    <span style={styles.icon}>🔎</span>
                </div>

                {/* 404 heading */}
                <div style={styles.badge}>❌ Page not found</div>

                <h1 style={styles.heading}>
                    <span style={styles.gradientText}>404</span>
                </h1>

                <p style={styles.tagline}>
                    <em>"This story couldn't be verified…&nbsp;</em>
                    <br />
                    because it doesn't exist."
                </p>

                <p style={styles.sub}>
                    The page you're looking for may have been moved, deleted, or never existed.
                    Try searching below or use one of the quick links.
                </p>

                {/* Search bar */}
                <form onSubmit={handleSearch} style={styles.searchForm}>
                    <div style={styles.searchWrapper}>
                        <span style={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search or paste a news URL to analyze…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            style={styles.searchInput}
                            aria-label="Search or analyze news"
                        />
                        <button type="submit" className="btn btn-primary" style={styles.searchBtn}>
                            Analyze
                        </button>
                    </div>
                </form>

                {/* Primary CTAs */}
                <div style={styles.ctas}>
                    <Link to="/" className="btn btn-primary btn-lg">
                        🏠 Go Home
                    </Link>
                    <Link to="/analyze" className="btn btn-secondary btn-lg">
                        🔍 Open Analyzer
                    </Link>
                </div>

                {/* Quick links grid */}
                <div style={styles.divider}>
                    <span style={styles.dividerText}>Or jump to a page</span>
                </div>

                <div style={styles.grid}>
                    {quickLinks.map(({ to, emoji, label, desc }) => (
                        <Link key={to} to={to} style={styles.card} className="glass-card">
                            <span style={styles.cardEmoji}>{emoji}</span>
                            <span style={styles.cardLabel}>{label}</span>
                            <span style={styles.cardDesc}>{desc}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes float404 {
                    0%, 100% { transform: translateY(0px) rotate(-2deg); }
                    50%       { transform: translateY(-18px) rotate(2deg); }
                }
                @keyframes orb-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50%       { opacity: 0.8; transform: scale(1.15); }
                }
                @keyframes ring-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes nf-fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .nf-card-link:hover {
                    transform: translateY(-4px) !important;
                    border-color: rgba(99,102,241,0.4) !important;
                    box-shadow: 0 0 30px rgba(99,102,241,0.15) !important;
                }
                .nf-search-input:focus {
                    border-color: var(--accent-primary) !important;
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
    },

    /* Ambient orbs */
    orb: {
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        animation: 'orb-pulse 6s ease-in-out infinite',
    },
    orb1: {
        width: 500,
        height: 500,
        background: 'rgba(99,102,241,0.12)',
        top: '-120px',
        left: '-120px',
        animationDelay: '0s',
    },
    orb2: {
        width: 400,
        height: 400,
        background: 'rgba(168,85,247,0.10)',
        bottom: '-100px',
        right: '-100px',
        animationDelay: '2s',
    },
    orb3: {
        width: 300,
        height: 300,
        background: 'rgba(236,72,153,0.07)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        animationDelay: '4s',
    },

    content: {
        position: 'relative',
        zIndex: 1,
        maxWidth: 760,
        width: '100%',
        textAlign: 'center',
        animation: 'nf-fadeUp 0.7s ease both',
    },

    /* Floating icon */
    iconWrapper: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        width: 100,
        height: 100,
    },
    iconRing: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: '2px dashed rgba(99,102,241,0.4)',
        animation: 'ring-spin 12s linear infinite',
    },
    icon: {
        fontSize: '3rem',
        animation: 'float404 4s ease-in-out infinite',
        display: 'block',
    },

    /* Badge */
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 16px',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 9999,
        fontSize: '0.78rem',
        color: '#ef4444',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: 20,
    },

    /* Heading */
    heading: {
        fontSize: 'clamp(5rem, 18vw, 10rem)',
        fontWeight: 900,
        lineHeight: 1,
        marginBottom: 0,
        letterSpacing: '-0.04em',
    },
    gradientText: {
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'textGradient 4s ease infinite',
    },

    tagline: {
        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        marginBottom: 12,
        marginTop: 8,
    },
    sub: {
        fontSize: '0.95rem',
        color: 'var(--text-muted)',
        maxWidth: 480,
        margin: '0 auto 32px',
        lineHeight: 1.7,
    },

    /* Search */
    searchForm: {
        marginBottom: 28,
    },
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(26,26,46,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        backdropFilter: 'blur(20px)',
        padding: '6px 6px 6px 16px',
        gap: 10,
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
    },
    searchIcon: {
        fontSize: '1.1rem',
        flexShrink: 0,
    },
    searchInput: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family)',
        fontSize: '0.95rem',
        padding: '8px 0',
    },
    searchBtn: {
        flexShrink: 0,
        padding: '10px 22px',
        borderRadius: 10,
    },

    /* CTAs */
    ctas: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 40,
    },

    /* Divider */
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    dividerText: {
        flex: 1,
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        position: 'relative',
    },

    /* Quick links grid */
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 14,
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '20px 12px',
        borderRadius: 14,
        textDecoration: 'none',
        transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        cursor: 'pointer',
    },
    cardEmoji: {
        fontSize: '1.6rem',
        marginBottom: 2,
    },
    cardLabel: {
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    cardDesc: {
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        lineHeight: 1.4,
    },
};

export default NotFound;
