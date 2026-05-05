import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const FACTOR_LABELS = {
    sentiment: { icon: '🎭', name: 'Sentiment Analysis' },
    clickbait: { icon: '🪝', name: 'Clickbait Detection' },
    language: { icon: '📝', name: 'Language Quality' },
    emotional: { icon: '💔', name: 'Emotional Manipulation' },
    sourceAttribution: { icon: '📑', name: 'Source Attribution' },
    bias: { icon: '⚖️', name: 'Bias Detection' },
    sourceTrust: { icon: '🏛️', name: 'Source Trust Rating' },
    mlModel: { icon: '🤖', name: 'ML Model (TF-IDF + LR)' },
    aiAnalysis: { icon: '✨', name: 'AI Analysis' },
};

// ─── Color helpers ────────────────────────────────────────────────────────────
function getScoreColor(score) {
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    if (score >= 30) return '#f97316';
    return 'var(--danger)';
}

function getVerdictStyle(verdict) {
    switch (verdict) {
        case 'Likely Credible':    return { bg: 'var(--success-bg)', color: 'var(--success)', icon: '✅' };
        case 'Needs Verification': return { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: '⚠️' };
        case 'Suspicious':         return { bg: 'rgba(249,115,22,0.12)', color: '#f97316', icon: '🟠' };
        case 'Likely Fake':        return { bg: 'var(--danger-bg)', color: 'var(--danger)', icon: '🚫' };
        default:                   return { bg: 'var(--info-bg)', color: 'var(--info)', icon: '🔍' };
    }
}

function getSentenceTagStyle(tag) {
    switch (tag) {
        case 'suspicious': return {
            background: 'rgba(239,68,68,0.12)',
            borderLeft: '3px solid var(--danger)',
            color: 'var(--danger)',
            badge: '⚠️ Suspicious',
            badgeColor: '#ef4444',
        };
        case 'credible': return {
            background: 'rgba(34,197,94,0.08)',
            borderLeft: '3px solid var(--success)',
            color: 'var(--success)',
            badge: '✅ Credible',
            badgeColor: '#22c55e',
        };
        default: return {
            background: 'transparent',
            borderLeft: '3px solid transparent',
            color: 'var(--text-primary)',
            badge: null,
            badgeColor: null,
        };
    }
}

// ─── Animated confidence meter ────────────────────────────────────────────────
function ConfidenceBar({ value, label, color }) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setWidth(value), 150);
        return () => clearTimeout(t);
    }, [value]);
    return (
        <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ fontWeight: 800, color, letterSpacing: '0.02em' }}>{Math.round(value)}%</span>
            </div>
            <div className="meter-bar">
                <div 
                    className="meter-bar-fill"
                    style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                        '--glow-color': `${color}44`,
                    }} 
                />
            </div>
        </div>
    );
}

// ─── Loading Progress ────────────────────────────────────────────────────────
function LoadingProgress() {
    return (
        <div className="loading-progress-container">
            <div className="loading-progress-fill" />
        </div>
    );
}

// ─── ML Prediction Panel ──────────────────────────────────────────────────────
function MLPanel({ ml }) {
    if (!ml) return null;
    const isFake = ml.label === 'fake';
    const mainColor = isFake ? 'var(--danger)' : 'var(--success)';

    return (
        <div className="glass-card" style={{
            padding: '1.5rem',
            marginBottom: 'var(--space-lg)',
            border: `1px solid ${isFake ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: '1rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: isFake ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                }}>🤖</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>ML Model Prediction</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ml.modelUsed}</div>
                </div>
                <div className={`verdict-badge-lg`} style={{
                    marginLeft: 'auto',
                    padding: '8px 20px',
                    borderRadius: 999,
                    fontWeight: 900,
                    fontSize: '1rem',
                    background: isFake ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                    color: mainColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    border: `1px solid ${mainColor}44`,
                    '--glow-color': `${mainColor}33`,
                }}>
                    {isFake ? '🚫 FAKE' : '✅ REAL'}
                </div>
            </div>

            {/* Probability bars */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📊 Model Confidence
                </div>
                <ConfidenceBar value={ml.fakeProbability * 100} label="Fake Probability" color="var(--danger)" />
                <ConfidenceBar value={ml.realProbability * 100} label="Real Probability" color="var(--success)" />
            </div>

            {/* Reasons / Explanation */}
            {ml.reasons && ml.reasons.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        💡 Explanation
                    </div>
                    <div style={{ 
                        padding: '1rem 1.25rem', 
                        background: isFake ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)', 
                        borderRadius: '12px', 
                        fontSize: '0.9rem', 
                        color: 'var(--text-primary)', 
                        lineHeight: 1.7, 
                        borderLeft: `4px solid ${mainColor}` 
                    }}>
                        {ml.reasons.map((r, i) => (
                            <div key={i} style={{ marginBottom: i < ml.reasons.length - 1 ? '0.5rem' : 0 }}>
                                {r}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Suspicious words */}
            {ml.suspiciousWords && ml.suspiciousWords.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Suspicious Keywords
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {ml.suspiciousWords.map((w, i) => (
                            <span key={i} style={{
                                padding: '3px 10px', borderRadius: 999,
                                background: 'rgba(239,68,68,0.12)',
                                color: '#ef4444',
                                fontSize: '0.78rem', fontWeight: 600,
                            }}>{w}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Top influential words */}
            {ml.topInfluentialWords && ml.topInfluentialWords.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Top Influential Words (Model Features)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {ml.topInfluentialWords.map((w, i) => (
                            <span key={i} style={{
                                padding: '3px 10px', borderRadius: 999,
                                background: isFake ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)',
                                color: isFake ? '#f97316' : '#22c55e',
                                fontSize: '0.78rem', fontWeight: 600,
                            }}>{w}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Highlighted sentences panel ──────────────────────────────────────────────
function HighlightedSentences({ sentences }) {
    const [expanded, setExpanded] = useState(false);
    if (!sentences || sentences.length === 0) return null;

    const tagged = sentences.filter(s => s.tag !== 'neutral');
    const all = sentences;
    const shown = expanded ? all : all.slice(0, 6);

    return (
        <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>🔬 Sentence-Level Analysis</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {tagged.length} sentence(s) flagged — highlighted below.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {shown.map((s, i) => {
                    const style = getSentenceTagStyle(s.tag);
                    return (
                        <div key={i} style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 8,
                            background: style.background,
                            borderLeft: style.borderLeft,
                            fontSize: '0.88rem',
                            lineHeight: 1.7,
                        }}>
                            {style.badge && (
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: 700,
                                    color: style.badgeColor,
                                    background: `${style.badgeColor}18`,
                                    borderRadius: 999, padding: '2px 8px',
                                    marginRight: 8,
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    {style.badge}
                                </span>
                            )}
                            {s.text}
                            {s.reason && (
                                <div style={{ marginTop: 4, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    → {s.reason}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {all.length > 6 && (
                <button
                    className="btn btn-secondary"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? '▲ Show less' : `▼ Show all ${all.length} sentences`}
                </button>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
function Analyzer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mode, setMode] = useState('text');
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);

    const LOADING_STEPS = [
        'Analysing sentiment & language…',
        'Running clickbait & bias detection…',
        'Calling ML model (TF-IDF + LR)…',
        'Blending heuristic + ML scores…',
        'Generating sentence highlights…',
    ];

    // Loading step ticker
    useEffect(() => {
        if (!loading) { setLoadingStep(0); return; }
        const t = setInterval(() => setLoadingStep(s => (s + 1) % LOADING_STEPS.length), 1200);
        return () => clearInterval(t);
    }, [loading]);

    useEffect(() => {
        if (id) {
            const fetchAnalysis = async () => {
                setLoading(true);
                try {
                    const data = await api.getAnalysis(id);
                    setResult(data);
                } catch {
                    setError('Shared analysis not found.');
                } finally {
                    setLoading(false);
                }
            };
            fetchAnalysis();
        }
    }, [id]);

    const handleShare = () => {
        if (result?.id) {
            navigator.clipboard.writeText(`${window.location.origin}/analyze/${result.id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAnalyze = async () => {
        setError('');
        setResult(null);
        if (mode === 'text' && text.trim().length < 20) {
            setError('Please enter at least 20 characters for a meaningful analysis.');
            return;
        }
        if (mode === 'url' && !url.trim()) {
            setError('Please enter a valid URL.');
            return;
        }
        setLoading(true);
        try {
            const payload = mode === 'text' ? { text } : { url };
            const data = await api.analyze(payload);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const circumference = 2 * Math.PI * 70;
    const scoreOffset = result
        ? circumference - (result.overallScore / 100) * circumference
        : circumference;

    const verdictStyle = result ? getVerdictStyle(result.verdict) : null;

    return (
        <div className="analyzer-page container">
            <div className="analyzer-header">
                <h1>🔍 News <span className="gradient-text">Analyzer</span></h1>
                <p>Paste article text or enter a URL for ML-powered credibility analysis</p>
            </div>

            {/* Architecture badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 999, padding: '5px 14px', fontSize: '0.78rem',
                color: '#818cf8', marginBottom: '1.5rem', fontWeight: 600,
            }}>
                ⚡ React → Node.js → Python ML API (Hybrid Architecture)
            </div>

            {/* Tabs */}
            <div className="analyzer-tabs">
                <button className={`analyzer-tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
                    📝 Paste Text
                </button>
                <button className={`analyzer-tab ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>
                    🔗 Enter URL
                </button>
            </div>

            {/* Input card */}
            <div className="analyzer-input-card glass-card">
                {mode === 'text' ? (
                    <>
                        <textarea
                            className="analyzer-textarea"
                            placeholder={"Paste the news article text here…\n\nInclude the headline and full article body for best results."}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={10000}
                        />
                        <div className="char-count">{text.length.toLocaleString()} / 10,000 characters</div>
                    </>
                ) : (
                    <input
                        type="url"
                        className="input-field analyzer-url-input"
                        placeholder="https://example.com/news-article"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                )}

                {error && (
                    <div className="auth-error" style={{ marginTop: 'var(--space-md)' }}>{error}</div>
                )}

                <button
                    className="btn btn-primary btn-lg analyzer-submit"
                    onClick={handleAnalyze}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                            Analysing…
                        </>
                    ) : '🔍 Analyse Article'}
                </button>
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="loading-overlay">
                    <div className="spinner spinner-lg" />
                    <p style={{ marginTop: '1.5rem', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.01em' }}>{LOADING_STEPS[loadingStep]}</p>
                    <LoadingProgress />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                        Processing via Hybrid Heuristic-ML Pipeline...
                    </p>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="results-section">
                    <div className="result-header">
                        <h2 className="result-title">{result.title}</h2>
                        {result.sourceUrl && (
                            <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                🔗 {result.sourceUrl}
                            </a>
                        )}
                    </div>

                    {/* ── Verdict badge (large) ── */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.25rem',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        {/* Score ring */}
                        <div className="score-circle-container">
                            <div className="score-circle">
                                <svg viewBox="0 0 160 160">
                                    <circle className="score-circle-bg" cx="80" cy="80" r="70" />
                                    <circle
                                        className="score-circle-progress"
                                        cx="80" cy="80" r="70"
                                        stroke={getScoreColor(result.overallScore)}
                                        strokeDasharray={circumference}
                                        strokeDashoffset={scoreOffset}
                                    />
                                </svg>
                                <div className="score-circle-text">
                                    <div className="score-value" style={{ color: getScoreColor(result.overallScore) }}>
                                        {result.overallScore}
                                    </div>
                                    <div className="score-label">out of 100</div>
                                </div>
                            </div>
                        </div>

                        {/* Big verdict badge */}
                        <div className="verdict-badge-lg" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 12,
                            padding: '16px 40px', borderRadius: 20,
                            fontSize: '1.5rem', fontWeight: 900,
                            letterSpacing: '0.05em',
                            background: verdictStyle.bg,
                            color: verdictStyle.color,
                            border: `2px solid ${verdictStyle.color}50`,
                            '--glow-color': `${verdictStyle.color}44`,
                            textTransform: 'uppercase',
                        }}>
                            <span style={{ fontSize: '2rem' }}>{verdictStyle.icon}</span>
                            {result.verdict}
                        </div>

                        {/* Confidence bar for overall */}
                        <div style={{ width: '100%', maxWidth: 440 }}>
                            <ConfidenceBar
                                value={result.overallScore}
                                label="Overall Credibility Score"
                                color={getScoreColor(result.overallScore)}
                            />
                        </div>
                    </div>

                    {/* ── ML Prediction Panel ── */}
                    <MLPanel ml={result.mlPrediction} />

                    {/* ── Source info ── */}
                    {result.sourceInfo && (
                        <div className="glass-card" style={{
                            padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>SOURCE DATABASE MATCH</div>
                            <div style={{ fontWeight: 700 }}>{result.sourceInfo.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Credibility: {result.sourceInfo.credibility_score}/100 · Category: {result.sourceInfo.category} · Bias: {result.sourceInfo.bias}
                            </div>
                        </div>
                    )}

                    {/* ── Factor breakdown ── */}
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>📊 Factor Breakdown</h3>
                    <div className="factors-grid">
                        {Object.entries(result.factors).map(([key, score], i) => {
                            const label = FACTOR_LABELS[key] || { icon: '📌', name: key };
                            return (
                                <div className="factor-card" key={key} style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="factor-header">
                                        <div className="factor-name">
                                            <span>{label.icon}</span>
                                            <span>{label.name}</span>
                                        </div>
                                        <div className="factor-score" style={{ color: getScoreColor(score) }}>
                                            {Math.round(score)}/100
                                        </div>
                                    </div>
                                    <div className="factor-bar">
                                        <div
                                            className="factor-bar-fill"
                                            style={{
                                                width: `${score}%`,
                                                background: `linear-gradient(90deg, ${getScoreColor(score)}, ${getScoreColor(score)}88)`,
                                            }}
                                        />
                                    </div>
                                    <div className="factor-explanation">{result.explanations[key]}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Highlighted sentences ── */}
                    {result.mlPrediction?.highlightedSentences && (
                        <HighlightedSentences sentences={result.mlPrediction.highlightedSentences} />
                    )}

                    {/* ── Google Fact Checks ── */}
                    {result.factChecks && result.factChecks.length > 0 && (
                        <div style={{ marginTop: 'var(--space-xl)' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>🔎 Professional Fact Checks</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {result.factChecks.map((fc, i) => (
                                    <div key={i} className="glass-card" style={{ padding: 'var(--space-md)', borderLeft: '3px solid var(--accent-primary)' }}>
                                        <p style={{ fontWeight: 600, marginBottom: 8 }}>📌 "{fc.text}"</p>
                                        {fc.claimant && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Claimed by: {fc.claimant}</p>}
                                        {fc.reviews.map((r, j) => (
                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                                                    background: r.rating?.toLowerCase().includes('false') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                                    color: r.rating?.toLowerCase().includes('false') ? '#ef4444' : '#22c55e',
                                                }}>
                                                    {r.rating}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>by {r.publisher}</span>
                                                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>→ Read Review</a>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Action buttons ── */}
                    <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary btn-lg" onClick={handleShare}>
                            {copied ? '✅ Link Copied!' : '📤 Copy Share Link'}
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={() => {
                            setResult(null); setText(''); setUrl('');
                            if (id) navigate('/analyze');
                        }}>
                            🔄 Analyse Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Analyzer;
