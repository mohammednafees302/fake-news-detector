import { useState, useEffect } from 'react';
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
};

function getScoreColor(score) {
    if (score >= 75) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    if (score >= 30) return '#f97316';
    return 'var(--danger)';
}

function getVerdictStyle(verdict) {
    switch (verdict) {
        case 'Likely Credible': return { bg: 'var(--success-bg)', color: 'var(--success)' };
        case 'Needs Verification': return { bg: 'var(--warning-bg)', color: 'var(--warning)' };
        case 'Suspicious': return { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' };
        case 'Likely Fake': return { bg: 'var(--danger-bg)', color: 'var(--danger)' };
        default: return { bg: 'var(--info-bg)', color: 'var(--info)' };
    }
}

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

    useEffect(() => {
        if (id) {
            const fetchAnalysis = async () => {
                setLoading(true);
                try {
                    const data = await api.getAnalysis(id);
                    setResult(data);
                } catch (err) {
                    setError('Shared analysis not found.');
                } finally {
                    setLoading(false);
                }
            };
            fetchAnalysis();
        }
    }, [id]);

    const handleShare = () => {
        if (result && result.id) {
            const shareUrl = `${window.location.origin}/analyze/${result.id}`;
            navigator.clipboard.writeText(shareUrl);
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

    return (
        <div className="analyzer-page container">
            <div className="analyzer-header">
                <h1>🔍 News <span className="gradient-text">Analyzer</span></h1>
                <p>Paste article text or enter a URL for instant credibility analysis</p>
            </div>

            {/* Tabs */}
            <div className="analyzer-tabs">
                <button
                    className={`analyzer-tab ${mode === 'text' ? 'active' : ''}`}
                    onClick={() => setMode('text')}
                >
                    📝 Paste Text
                </button>
                <button
                    className={`analyzer-tab ${mode === 'url' ? 'active' : ''}`}
                    onClick={() => setMode('url')}
                >
                    🔗 Enter URL
                </button>
            </div>

            {/* Input */}
            <div className="analyzer-input-card glass-card">
                {mode === 'text' ? (
                    <>
                        <textarea
                            className="analyzer-textarea"
                            placeholder="Paste the news article text here...&#10;&#10;Include the headline and full article body for the most accurate analysis."
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
                    <div className="auth-error" style={{ marginTop: 'var(--space-md)' }}>
                        {error}
                    </div>
                )}

                <button
                    className="btn btn-primary btn-lg analyzer-submit"
                    onClick={handleAnalyze}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                            Analyzing...
                        </>
                    ) : (
                        '🔍 Analyze Article'
                    )}
                </button>
            </div>

            {/* Loading Animation */}
            {loading && (
                <div className="loading-overlay">
                    <div className="spinner spinner-lg"></div>
                    <p>Running multi-factor analysis...</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Checking sentiment, clickbait, language, bias, and more
                    </p>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="results-section">
                    <div className="result-header">
                        <h2 className="result-title">{result.title}</h2>
                        {result.sourceUrl && (
                            <a
                                href={result.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
                            >
                                🔗 {result.sourceUrl}
                            </a>
                        )}
                    </div>

                    {/* Score Circle */}
                    <div className="score-circle-container">
                        <div className="score-circle">
                            <svg viewBox="0 0 160 160">
                                <circle
                                    className="score-circle-bg"
                                    cx="80" cy="80" r="70"
                                />
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

                        <div
                            className="verdict-badge"
                            style={{
                                backgroundColor: getVerdictStyle(result.verdict).bg,
                                color: getVerdictStyle(result.verdict).color,
                            }}
                        >
                            {result.verdict === 'Likely Credible' && '✅'}
                            {result.verdict === 'Needs Verification' && '⚠️'}
                            {result.verdict === 'Suspicious' && '🟠'}
                            {result.verdict === 'Likely Fake' && '🚫'}
                            {result.verdict}
                        </div>
                    </div>

                    {/* Source Info */}
                    {result.sourceInfo && (
                        <div className="glass-card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SOURCE DATABASE MATCH</div>
                            <div style={{ fontWeight: 700 }}>{result.sourceInfo.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Credibility: {result.sourceInfo.credibility_score}/100 · Category: {result.sourceInfo.category} · Bias: {result.sourceInfo.bias}
                            </div>
                        </div>
                    )}

                    {/* Factor Breakdown */}
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
                                    <div className="factor-explanation">
                                        {result.explanations[key]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Google Fact Checks */}
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

                    {/* New Analysis Button */}
                    <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleShare}
                        >
                            {copied ? '✅ Link Copied!' : '📤 Copy Share Link'}
                        </button>
                        <button
                            className="btn btn-secondary btn-lg"
                            onClick={() => { 
                                setResult(null); setText(''); setUrl(''); 
                                if (id) navigate('/analyze');
                            }}
                        >
                            🔄 Analyze Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Analyzer;
