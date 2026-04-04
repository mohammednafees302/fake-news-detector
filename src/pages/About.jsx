function About() {
    const techStack = [
        { name: 'React 18', icon: '⚛️', color: '#61DAFB', desc: 'Frontend UI framework with hooks and React Router v6 for navigation.' },
        { name: 'Vite 5', icon: '⚡', color: '#646CFF', desc: 'Ultra-fast build tool and development server with HMR.' },
        { name: 'Node.js + Express', icon: '🟢', color: '#339933', desc: 'RESTful API server handling auth, analysis, reports, and stats.' },
        { name: 'SQLite (sql.js)', icon: '🗄️', color: '#003B57', desc: 'Zero-config in-memory + file-based database. No installation needed.' },
        { name: 'Chart.js', icon: '📊', color: '#FF6384', desc: 'Beautiful data visualizations including doughnut and bar charts.' },
        { name: 'natural.js', icon: '🧠', color: '#a78bfa', desc: 'NLP tokenization and TF-IDF analysis for language quality scoring.' },
        { name: 'sentiment.js', icon: '🎭', color: '#f59e0b', desc: 'VADER-based sentiment analysis to detect emotional tone.' },
        { name: 'cheerio', icon: '🕷️', color: '#e5a00d', desc: 'Server-side HTML parser used to scrape article text from any URL.' },
        { name: 'JWT + bcrypt', icon: '🔐', color: '#22c55e', desc: 'Secure JSON Web Token auth with bcrypt password hashing.' },
        { name: 'Chrome MV3', icon: '🧩', color: '#4285F4', desc: 'Browser extension using Manifest V3 for real-time article analysis.' },
    ];

    const analysisFactors = [
        { icon: '🎭', name: 'Sentiment Analysis', weight: '15%', desc: 'Uses VADER sentiment library to score the emotional intensity of writing. Credible articles are typically neutral. Highly emotional content (comparative score > 0.6) is flagged.', scoreExample: 'BBC Article: 92/100 (neutral) vs. tabloid: 28/100 (extreme)' },
        { icon: '🪝', name: 'Clickbait Detection', weight: '15%', desc: 'Matches against 20+ regex patterns like "you won\'t believe", "shocking", "exposed!", "one weird trick". Each match reduces credibility.', scoreExample: '3+ matches = heavily clickbait, score drops below 35' },
        { icon: '📝', name: 'Language Quality', weight: '10%', desc: 'Checks ALL CAPS ratio (>10% = suspicious), excessive punctuation (!! ???), vocabulary richness (unique words ratio), and minimum word count (< 50 words penalized).', scoreExample: 'Professional article: 85/100, social media post: 40/100' },
        { icon: '💔', name: 'Emotional Manipulation', weight: '20%', desc: 'Cross-references against a 40-word dictionary of loaded, fear-triggering words: "outrage", "conspiracy", "hoax", "dictator", "tyranny", etc. Higher density = lower score.', scoreExample: '> 4% emotional word density = score drops below 40' },
        { icon: '📑', name: 'Source Attribution', weight: '25%', desc: 'Highest-weighted factor. Checks for credible citation patterns (named experts, institutions, "peer-reviewed") vs. vague ones ("sources say", "people are saying", "reportedly").', scoreExample: '3+ credible citations: 90/100. 0 citations + 3 vague: 30/100' },
        { icon: '⚖️', name: 'Bias Detection', weight: '15%', desc: 'Detects absolute language ("always", "never", "obviously"), prescriptive words ("must", "should"), and political labels ("leftist", "fascist", "regime"). Weighted by severity.', scoreExample: 'Heavily labeled political opinion: 15/100' },
    ];

    return (
        <div className="about-page container page-enter">
            {/* Header */}
            <div className="analyzer-header">
                <h1>About <span className="gradient-text">VerifyNews</span></h1>
                <p>An open-source college project built to fight misinformation with technology</p>
            </div>

            {/* Mission */}
            <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎯</div>
                <h2 style={{ marginBottom: 'var(--space-md)' }}>Our Mission</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto', lineHeight: 1.8, fontSize: '1.05rem' }}>
                    In an era of viral misinformation, we built VerifyNews to give everyone — not just journalists — a 
                    powerful tool to quickly assess news credibility. We use <strong>multi-factor Natural Language Processing</strong>, 
                    a curated source database, and optional AI to score any article in under a second. No bias. No subscription. Just facts.
                </p>
            </div>

            {/* How It Works Deep Dive */}
            <section style={{ marginBottom: 'var(--space-xxl)' }}>
                <div className="section-header">
                    <h2>How The <span className="gradient-text">Algorithm Works</span></h2>
                    <p>Six independent factors, each scored 0–100, combined into a final credibility score</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                    {analysisFactors.map((factor, i) => (
                        <div key={i} className="glass-card" style={{ padding: 'var(--space-lg)', display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
                            <div style={{
                                fontSize: '2rem', minWidth: 56, height: 56, borderRadius: 16,
                                background: 'rgba(99,102,241,0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                {factor.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 8 }}>
                                    <h3 style={{ margin: 0 }}>{factor.name}</h3>
                                    <span style={{
                                        padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                                        background: 'var(--accent-gradient)', color: 'white'
                                    }}>{factor.weight}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.7 }}>{factor.desc}</p>
                                <div style={{ 
                                    padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)',
                                    fontSize: '0.8rem', color: 'var(--accent-primary)', fontFamily: 'monospace'
                                }}>
                                    📌 {factor.scoreExample}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section style={{ marginBottom: 'var(--space-xxl)' }}>
                <div className="section-header">
                    <h2>🛠️ Tech <span className="gradient-text">Stack</span></h2>
                    <p>Built entirely with open-source technologies. No paid services required to run locally.</p>
                </div>
                <div className="features-grid">
                    {techStack.map((tech, i) => (
                        <div key={i} className="feature-card glass-card" style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className="feature-icon" style={{ fontSize: '2rem' }}>{tech.icon}</div>
                            <h3 style={{ color: tech.color }}>{tech.name}</h3>
                            <p style={{ fontSize: '0.875rem' }}>{tech.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Open Source CTA */}
            <div className="cta-section">
                <div className="cta-card">
                    <h2>⭐ <span className="gradient-text">Open Source</span> & Free</h2>
                    <p>VerifyNews is open source. Fork it, contribute to it, or use it as a template for your own project.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-lg)' }}>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                            ⭐ Star on GitHub
                        </a>
                        <a href="/analyze" className="btn btn-secondary btn-lg">
                            🔍 Try the Analyzer
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;
