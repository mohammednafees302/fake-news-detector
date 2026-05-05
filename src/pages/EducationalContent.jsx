import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ICONS = {
    'Misinformation': '🚨',
    'Bias Detection': '⚖️',
    'Source Verification': '🔍',
    'Fact-Checking': '✅',
};

const DIFFICULTY_COLORS = {
    'Beginner':     { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
    'Intermediate': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    'Advanced':     { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
};

const READ_TIME = (text) => `${Math.max(1, Math.ceil(text.split(' ').length / 200))} min read`;

export default function EducationalContent() {
    const [content, setContent]                 = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState('');
    const [activeArticle, setActiveArticle]     = useState(null);
    const [searchQuery, setSearchQuery]         = useState('');

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const params = new URLSearchParams();
            if (selectedCategory !== 'all') params.set('category', selectedCategory);
            if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty);
            const response = await fetch(`/api/features/educational-content?${params}`);
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            setContent(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, selectedDifficulty]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    // Close modal on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setActiveArticle(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = activeArticle ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [activeArticle]);

    const categories = ['Misinformation', 'Bias Detection', 'Source Verification', 'Fact-Checking'];
    const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

    const filtered = content.filter(item =>
        !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: content.length,
        beginner: content.filter(c => c.difficulty_level === 'Beginner').length,
        intermediate: content.filter(c => c.difficulty_level === 'Intermediate').length,
        advanced: content.filter(c => c.difficulty_level === 'Advanced').length,
    };

    return (
        <div style={s.page}>
            {/* Hero */}
            <div style={s.hero}>
                <div style={s.heroInner}>
                    <div style={s.heroBadge}>🎓 Media Literacy Hub</div>
                    <h1 style={s.heroTitle}>Learning Center</h1>
                    <p style={s.heroSub}>
                        Master the art of identifying misinformation, detecting bias,<br />
                        and verifying sources like a professional fact-checker.
                    </p>
                    {/* Search */}
                    <div style={s.searchBar}>
                        <span style={s.searchIcon}>🔍</span>
                        <input
                            style={s.searchInput}
                            placeholder="Search articles…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button style={s.searchClear} onClick={() => setSearchQuery('')}>✕</button>
                        )}
                    </div>
                </div>
            </div>

            <div style={s.main}>
                {/* Stats row */}
                <div style={s.statsRow}>
                    {[
                        { label: 'Total Articles', value: stats.total, icon: '📚' },
                        { label: 'Beginner', value: stats.beginner, icon: '🟢' },
                        { label: 'Intermediate', value: stats.intermediate, icon: '🟡' },
                        { label: 'Advanced', value: stats.advanced, icon: '🔴' },
                    ].map(st => (
                        <div key={st.label} style={s.statCard} className="glass-card">
                            <span style={s.statIcon}>{st.icon}</span>
                            <span style={s.statValue}>{st.value}</span>
                            <span style={s.statLabel}>{st.label}</span>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={s.filtersRow}>
                    <div style={s.filterGroup}>
                        <span style={s.filterLabel}>Category</span>
                        <div style={s.pills}>
                            <button
                                style={s.pill(selectedCategory === 'all')}
                                onClick={() => setSelectedCategory('all')}
                            >All</button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    style={s.pill(selectedCategory === cat)}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {CATEGORY_ICONS[cat]} {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={s.filterGroup}>
                        <span style={s.filterLabel}>Difficulty</span>
                        <div style={s.pills}>
                            <button
                                style={s.pill(selectedDifficulty === 'all')}
                                onClick={() => setSelectedDifficulty('all')}
                            >All Levels</button>
                            {difficulties.map(diff => (
                                <button
                                    key={diff}
                                    style={{
                                        ...s.pill(selectedDifficulty === diff),
                                        ...(selectedDifficulty === diff && DIFFICULTY_COLORS[diff]
                                            ? { background: DIFFICULTY_COLORS[diff].bg, color: DIFFICULTY_COLORS[diff].color, borderColor: DIFFICULTY_COLORS[diff].color }
                                            : {})
                                    }}
                                    onClick={() => setSelectedDifficulty(diff)}
                                >{diff}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results label */}
                {!loading && !error && (
                    <p style={s.resultsLabel}>
                        {searchQuery
                            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"`
                            : `${filtered.length} article${filtered.length !== 1 ? 's' : ''}`}
                    </p>
                )}

                {/* States */}
                {loading && (
                    <div style={s.center}>
                        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--text-muted)' }}>Loading articles…</p>
                    </div>
                )}
                {!loading && error && (
                    <div style={s.center}>
                        <div style={s.errorBox}>⚠️ {error}</div>
                    </div>
                )}

                {/* Grid */}
                {!loading && !error && (
                    filtered.length === 0 ? (
                        <div style={s.center}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔎</div>
                            <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No articles found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <div style={s.grid}>
                            {filtered.map(item => (
                                <article key={item.id} style={s.card} className="glass-card"
                                    onClick={() => setActiveArticle(item)}
                                >
                                    <div style={s.cardTop}>
                                        <span style={s.cardCatIcon}>{CATEGORY_ICONS[item.category] || '📄'}</span>
                                        <div style={s.cardBadges}>
                                            <span style={{ ...s.badge, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
                                                {item.category}
                                            </span>
                                            <span style={{
                                                ...s.badge,
                                                background: (DIFFICULTY_COLORS[item.difficulty_level] || {}).bg || 'rgba(255,255,255,0.06)',
                                                color: (DIFFICULTY_COLORS[item.difficulty_level] || {}).color || 'var(--text-muted)',
                                            }}>
                                                {item.difficulty_level}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 style={s.cardTitle}>{item.title}</h3>
                                    <p style={s.cardPreview}>{item.content.substring(0, 140)}…</p>
                                    <div style={s.cardFooter}>
                                        <span style={s.readTime}>⏱ {READ_TIME(item.content)}</span>
                                        <button
                                            style={s.readMoreBtn}
                                            onClick={e => { e.stopPropagation(); setActiveArticle(item); }}
                                        >
                                            Read More →
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Modal */}
            {activeArticle && (
                <div style={s.overlay} onClick={() => setActiveArticle(null)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <button style={s.modalClose} onClick={() => setActiveArticle(null)} aria-label="Close">✕</button>

                        <div style={s.modalHeader}>
                            <div style={s.modalBadges}>
                                <span style={{ ...s.badge, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
                                    {CATEGORY_ICONS[activeArticle.category]} {activeArticle.category}
                                </span>
                                <span style={{
                                    ...s.badge,
                                    background: (DIFFICULTY_COLORS[activeArticle.difficulty_level] || {}).bg || '',
                                    color: (DIFFICULTY_COLORS[activeArticle.difficulty_level] || {}).color || '',
                                }}>
                                    {activeArticle.difficulty_level}
                                </span>
                                <span style={{ ...s.badge, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                    ⏱ {READ_TIME(activeArticle.content)}
                                </span>
                            </div>
                            <h2 style={s.modalTitle}>{activeArticle.title}</h2>
                        </div>

                        <div style={s.modalBody}>
                            {activeArticle.content.split('. ').reduce((acc, sentence, i, arr) => {
                                // Group into paragraphs of ~3 sentences
                                const idx = Math.floor(i / 3);
                                if (!acc[idx]) acc[idx] = [];
                                acc[idx].push(sentence + (i < arr.length - 1 ? '.' : ''));
                                return acc;
                            }, []).map((para, i) => (
                                <p key={i} style={s.modalPara}>{para.join(' ')}</p>
                            ))}
                        </div>

                        <div style={s.modalFooter}>
                            <button className="btn btn-secondary" onClick={() => setActiveArticle(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => window.location.href = '/analyze'}>
                                🔍 Try the Analyzer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Styles ─────────────────────────────────────────── */
const s = {
    page: { minHeight: '100vh', background: 'var(--bg-primary)' },

    hero: {
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 50%, transparent 100%)',
        borderBottom: '1px solid var(--border-color)',
        padding: '64px 24px',
    },
    heroInner: { maxWidth: 720, margin: '0 auto', textAlign: 'center' },
    heroBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 16px',
        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 9999, fontSize: '0.8rem', color: 'var(--accent-primary)',
        fontWeight: 600, marginBottom: 20, letterSpacing: '0.04em',
    },
    heroTitle: {
        fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900,
        background: 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)',
        backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        marginBottom: 16,
    },
    heroSub: { color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 32 },

    searchBar: {
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 14, padding: '8px 16px', maxWidth: 480, margin: '0 auto',
        backdropFilter: 'blur(20px)',
    },
    searchIcon: { fontSize: '1rem', flexShrink: 0 },
    searchInput: {
        flex: 1, background: 'transparent', border: 'none', outline: 'none',
        color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', padding: '4px 0',
    },
    searchClear: {
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: '1rem', padding: '2px 4px',
    },

    main: { maxWidth: 1200, margin: '0 auto', padding: '40px 24px' },

    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 40 },
    statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', borderRadius: 14, gap: 4 },
    statIcon: { fontSize: '1.5rem', marginBottom: 4 },
    statValue: { fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' },
    statLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 },

    filtersRow: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 },
    filterGroup: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    filterLabel: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 70, textTransform: 'uppercase', letterSpacing: '0.06em' },
    pills: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    pill: (active) => ({
        padding: '7px 16px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid',
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
        background: active ? 'rgba(99,102,241,0.15)' : 'var(--bg-glass)',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    }),

    resultsLabel: { color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 },

    center: { textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' },
    errorBox: {
        background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.25)',
        color: 'var(--danger)', padding: '16px 24px', borderRadius: 12, display: 'inline-block',
    },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 },
    card: {
        borderRadius: 16, padding: '24px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    },
    cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardCatIcon: { fontSize: '2rem' },
    cardBadges: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
    badge: { padding: '4px 10px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 600 },
    cardTitle: { fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 },
    cardPreview: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1 },
    cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    readTime: { fontSize: '0.78rem', color: 'var(--text-muted)' },
    readMoreBtn: {
        background: 'var(--accent-gradient)', backgroundSize: '200% auto',
        border: 'none', color: 'white', padding: '8px 18px', borderRadius: 9,
        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    /* Modal */
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'fadeIn 0.2s ease',
    },
    modal: {
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
        borderRadius: 20, maxWidth: 720, width: '100%', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fadeInUp 0.3s ease',
        position: 'relative',
    },
    modalClose: {
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)',
        borderRadius: '50%', width: 36, height: 36, display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        color: 'var(--text-secondary)', fontSize: '0.9rem', zIndex: 1,
        transition: 'all 0.15s ease',
    },
    modalHeader: {
        padding: '28px 28px 20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'linear-gradient(135deg,rgba(99,102,241,0.08),transparent)',
    },
    modalBadges: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    modalTitle: { fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 },
    modalBody: { padding: '24px 28px', overflowY: 'auto', flex: 1 },
    modalPara: { color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.97rem', marginBottom: 20 },
    modalFooter: {
        padding: '20px 28px', borderTop: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'flex-end', gap: 12,
        background: 'var(--bg-secondary)',
    },
};
