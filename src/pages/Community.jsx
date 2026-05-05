import React, { useState, useContext, useEffect } from 'react';
import AuthContext from '../context/AuthContext';

const getToken = () => localStorage.getItem('verifynews_token');

export default function Community() {
    const [activeTab, setActiveTab] = useState('discussions');
    const [newComment, setNewComment] = useState('');
    const [selectedAnalysis, setSelectedAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { user } = useContext(AuthContext);

    // Some mock data to make the UI look populated and world-class
    const mockDiscussions = [
        { id: '1', title: 'Analysis of the recent election claims', replies: 24, lastActive: '2 mins ago', author: 'truth_seeker' },
        { id: '2', title: 'Deepfake video circulating on social media', replies: 89, lastActive: '1 hr ago', author: 'media_literacy_bot' },
        { id: '3', title: 'Fact-checking the new health supplement', replies: 12, lastActive: '3 hrs ago', author: 'science_first' },
    ];

    const handleAddComment = async () => {
        if (!selectedAnalysis || !newComment.trim()) {
            setMessage('⚠️ Please enter an Analysis ID and a comment.');
            return;
        }

        if (!user) {
            setMessage('⚠️ You must be logged in to post a comment.');
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            const response = await fetch(`/api/community/${selectedAnalysis}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ content: newComment })
            });

            if (response.ok) {
                setNewComment('');
                setMessage('✅ Comment posted successfully! The community thanks you.');
            } else {
                const data = await response.json();
                setMessage(`⚠️ Error: ${data.error || 'Failed to post comment'}`);
            }
        } catch (err) {
            setMessage(`⚠️ Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (analysisId, voteType) => {
        if (!user) {
            setMessage('⚠️ You must be logged in to vote.');
            return;
        }
        try {
            const response = await fetch(`/api/community/${analysisId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ voteType })
            });

            if (response.ok) {
                setMessage('✅ Vote recorded! Your feedback helps improve accuracy.');
            } else {
                setMessage('⚠️ Failed to record vote. Please try again.');
            }
        } catch (err) {
            setMessage(`⚠️ Error voting: ${err.message}`);
        }
    };

    return (
        <div style={s.page}>
            {/* Hero Section */}
            <div style={s.hero}>
                <div style={s.heroInner}>
                    <div style={s.heroBadge}>👥 Community Hub</div>
                    <h1 style={s.heroTitle}>The Verification Network</h1>
                    <p style={s.heroSub}>
                        Join thousands of fact-checkers. Discuss analyses, vote on accuracy,<br />
                        and help build the world's most reliable truth engine.
                    </p>
                </div>
            </div>

            <div style={s.main}>
                {/* Tabs */}
                <div style={s.tabsContainer}>
                    <button 
                        style={s.tab(activeTab === 'discussions')} 
                        onClick={() => { setActiveTab('discussions'); setMessage(''); }}
                    >
                        💬 Active Discussions
                    </button>
                    <button 
                        style={s.tab(activeTab === 'voting')} 
                        onClick={() => { setActiveTab('voting'); setMessage(''); }}
                    >
                        ⚖️ Peer Review Voting
                    </button>
                </div>

                <div style={s.contentArea}>
                    {message && (
                        <div style={message.includes('✅') ? s.successMsg : s.errorMsg}>
                            {message}
                        </div>
                    )}

                    {activeTab === 'discussions' && (
                        <div style={s.twoColGrid}>
                            <div style={s.formSection}>
                                <h2 style={s.sectionTitle}>Join the Conversation</h2>
                                <p style={s.sectionDesc}>
                                    Have insights on a specific analysis? Enter the Analysis ID and share your thoughts with the community.
                                </p>
                                
                                <div style={s.formCard} className="glass-card">
                                    <div style={s.inputGroup}>
                                        <label style={s.label}>Analysis ID</label>
                                        <input
                                            style={s.input}
                                            type="text"
                                            placeholder="e.g., 8f72a-9b1c-..."
                                            value={selectedAnalysis}
                                            onChange={(e) => setSelectedAnalysis(e.target.value)}
                                        />
                                    </div>
                                    <div style={s.inputGroup}>
                                        <label style={s.label}>Your Insight</label>
                                        <textarea
                                            style={s.textarea}
                                            placeholder="Share your fact-checking findings, context, or questions..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            rows="4"
                                        />
                                    </div>
                                    <button 
                                        style={s.submitBtn}
                                        onClick={handleAddComment}
                                        disabled={loading}
                                    >
                                        {loading ? 'Posting...' : 'Publish Insight'}
                                    </button>
                                </div>
                            </div>

                            <div style={s.feedSection}>
                                <h2 style={s.sectionTitle}>Trending Topics</h2>
                                <p style={s.sectionDesc}>What the community is investigating right now.</p>
                                
                                <div style={s.feedList}>
                                    {mockDiscussions.map(disc => (
                                        <div key={disc.id} style={s.feedCard} className="glass-card" onClick={() => setSelectedAnalysis(`demo-analysis-${disc.id}`)}>
                                            <h3 style={s.feedTitle}>{disc.title}</h3>
                                            <div style={s.feedMeta}>
                                                <span style={s.feedAuthor}>@{disc.author}</span>
                                                <span style={s.feedStats}>
                                                    💬 {disc.replies} replies • {disc.lastActive}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'voting' && (
                        <div style={s.votingSection}>
                            <div style={s.votingHero}>
                                <h2 style={s.sectionTitle}>Community Peer Review</h2>
                                <p style={s.sectionDesc}>
                                    VerifyNews relies on community consensus to train our AI. 
                                    Review recent fact-checks and cast your vote on their accuracy.
                                </p>
                            </div>

                            {/* Demo Voting Cards to make the UI look alive */}
                            <div style={s.votingGrid}>
                                {[
                                    { id: 'v1', title: 'Claims about deep ocean blue light', score: 88, verdict: 'Likely Credible' },
                                    { id: 'v2', title: 'Fabricated Quote from Senator', score: 22, verdict: 'Likely Fake' }
                                ].map(item => (
                                    <div key={item.id} style={s.voteCard} className="glass-card">
                                        <div style={s.voteCardHeader}>
                                            <span style={s.voteScore(item.score)}>{item.score}%</span>
                                            <span style={s.voteVerdict}>{item.verdict}</span>
                                        </div>
                                        <h3 style={s.voteTitle}>{item.title}</h3>
                                        <p style={s.voteDesc}>Review the AI's analysis of this claim. Was the verdict accurate and helpful?</p>
                                        
                                        <div style={s.voteButtons}>
                                            <button 
                                                style={s.voteBtn('helpful')}
                                                onClick={() => handleVote(item.id, 'helpful')}
                                            >
                                                👍 Accurate & Helpful
                                            </button>
                                            <button 
                                                style={s.voteBtn('unhelpful')}
                                                onClick={() => handleVote(item.id, 'unhelpful')}
                                            >
                                                👎 Inaccurate / Biased
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Styles ─────────────────────────────────────────── */
const s = {
    page: { minHeight: '100vh', background: 'var(--bg-primary)' },

    hero: {
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(2ec4b6,0.05) 100%)',
        borderBottom: '1px solid var(--border-color)',
        padding: '64px 24px',
        position: 'relative',
        overflow: 'hidden'
    },
    heroInner: { maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 },
    heroBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 16px',
        background: 'rgba(46,196,182,0.12)', border: '1px solid rgba(46,196,182,0.25)',
        borderRadius: 9999, fontSize: '0.8rem', color: '#2ec4b6',
        fontWeight: 600, marginBottom: 20, letterSpacing: '0.04em',
    },
    heroTitle: {
        fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900,
        background: 'linear-gradient(135deg,#6366f1,#2ec4b6,#a855f7)',
        backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        marginBottom: 16,
    },
    heroSub: { color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7 },

    main: { maxWidth: 1200, margin: '0 auto', padding: '40px 24px' },

    tabsContainer: {
        display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40,
        background: 'var(--bg-card)', padding: 8, borderRadius: 16, 
        border: '1px solid var(--border-color)', width: 'fit-content', margin: '0 auto 40px'
    },
    tab: (active) => ({
        padding: '12px 24px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
        background: active ? 'var(--accent-gradient)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        boxShadow: active ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
    }),

    contentArea: { animation: 'fadeIn 0.3s ease' },

    errorMsg: {
        background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.25)',
        color: 'var(--danger)', padding: '16px 24px', borderRadius: 12, marginBottom: 24,
        textAlign: 'center', fontWeight: 500
    },
    successMsg: {
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
        color: '#22c55e', padding: '16px 24px', borderRadius: 12, marginBottom: 24,
        textAlign: 'center', fontWeight: 500
    },

    twoColGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 40 },
    
    sectionTitle: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 },
    sectionDesc: { color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 24 },

    formCard: { padding: 32, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 20 },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: {
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
        padding: '14px 16px', borderRadius: 12, color: 'var(--text-primary)',
        fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s ease',
    },
    textarea: {
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
        padding: '14px 16px', borderRadius: 12, color: 'var(--text-primary)',
        fontSize: '1rem', outline: 'none', resize: 'vertical', minHeight: 120,
        transition: 'border-color 0.2s ease', fontFamily: 'inherit'
    },
    submitBtn: {
        background: 'var(--accent-gradient)', border: 'none', color: '#fff',
        padding: '16px', borderRadius: 12, fontSize: '1rem', fontWeight: 700,
        cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        marginTop: 8, boxShadow: '0 8px 20px rgba(99,102,241,0.25)'
    },

    feedList: { display: 'flex', flexDirection: 'column', gap: 16 },
    feedCard: { 
        padding: 20, borderRadius: 16, cursor: 'pointer', 
        transition: 'transform 0.2s ease, border-color 0.2s ease'
    },
    feedTitle: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 },
    feedMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' },
    feedAuthor: { color: 'var(--accent-primary)', fontWeight: 600 },
    feedStats: { color: 'var(--text-muted)' },

    votingSection: { maxWidth: 900, margin: '0 auto' },
    votingHero: { textAlign: 'center', marginBottom: 40 },
    votingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 },
    voteCard: { padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 16 },
    voteCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    voteScore: (score) => ({
        background: score > 70 ? 'rgba(34,197,94,0.15)' : score > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
        color: score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444',
        padding: '6px 12px', borderRadius: 9999, fontWeight: 800, fontSize: '0.9rem'
    }),
    voteVerdict: { color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 },
    voteTitle: { fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 },
    voteDesc: { color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 },
    voteButtons: { display: 'flex', gap: 12, marginTop: 8 },
    voteBtn: (type) => ({
        flex: 1, padding: '12px 0', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s ease',
        background: type === 'helpful' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${type === 'helpful' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        color: type === 'helpful' ? '#22c55e' : '#ef4444',
    })
};
