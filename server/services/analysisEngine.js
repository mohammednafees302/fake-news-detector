import Sentiment from 'sentiment';
import natural from 'natural';
import fetch from 'node-fetch';

const sentiment = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Clickbait patterns
const CLICKBAIT_PATTERNS = [
    /you won'?t believe/i,
    /what happens next/i,
    /shocked/i,
    /mind[- ]?blow/i,
    /doctors hate/i,
    /one weird trick/i,
    /this is why/i,
    /breaking:?\s/i,
    /exposed!?/i,
    /exposed:?\s/i,
    /secret.*(revealed|exposed|they|don'?t)/i,
    /\b(amazing|incredible|unbelievable|insane|crazy)\b/i,
    /click here/i,
    /share before/i,
    /gone wrong/i,
    /you need to (see|know|read)/i,
    /will make you (cry|laugh|angry)/i,
    /\d+ (reasons|things|ways|facts|secrets)/i,
    /the truth about/i,
    /exposed!?\s/i,
    /wake up/i,
    /sheeple/i,
    /mainstream media/i,
    /they don'?t want you to know/i,
    /exposed!?\s/i,
];

// Emotional/manipulative language
const EMOTIONAL_WORDS = [
    'outrage', 'disgusting', 'horrifying', 'terrifying', 'shocking',
    'devastating', 'nightmare', 'disaster', 'catastrophe', 'emergency',
    'scandal', 'corrupt', 'evil', 'sinister', 'deadly', 'explosive',
    'bombshell', 'destroy', 'attack', 'threaten', 'dangerous',
    'warning', 'alert', 'urgent', 'critical', 'breaking',
    'conspiracy', 'cover-up', 'coverup', 'hoax', 'scam', 'fraud',
    'propaganda', 'brainwash', 'lie', 'lies', 'liar', 'traitor',
    'betrayal', 'treason', 'tyranny', 'dictator', 'regime'
];

// Vague attribution phrases
const VAGUE_SOURCES = [
    /sources say/i,
    /people are saying/i,
    /many (people|experts|scientists) (say|believe|think|claim)/i,
    /it is (widely )?believed/i,
    /according to sources/i,
    /insiders? (say|claim|reveal)/i,
    /a? ?source close to/i,
    /reportedly/i,
    /alleged(ly)?/i,
    /rumou?red? to/i,
    /anonymous (source|tip|insider)/i,
    /undisclosed/i,
    /some say/i,
    /experts? warn/i,
    /studies? show/i,
    /research (proves|shows|confirms)/i,
];

// Credible attribution patterns
const CREDIBLE_PATTERNS = [
    /according to ([A-Z][a-z]+ ){1,3}(at|from|of)/i,
    /\b(professor|dr\.|researcher|scientist|official|spokesperson)\b/i,
    /\b(university|institute|organization|department|agency)\b/i,
    /\b(published|peer-reviewed|journal|study|paper)\b/i,
    /\b(data shows?|statistics? (show|indicate)|survey (found|shows?))\b/i,
    /\b(confirmed by|verified by|corroborated by)\b/i,
];

export async function analyzeNews(text, sourceUrl = null) {
    const title = extractTitle(text);
    const body = text;
    const tokens = tokenizer.tokenize(text.toLowerCase());

    const factors = {};
    const explanations = {};

    // 1. Sentiment Analysis (0-100, higher = more neutral = more credible)
    const sentResult = sentiment.analyze(text);
    const sentScore = sentResult.comparative;
    const absSent = Math.abs(sentScore);
    let sentimentScore;
    if (absSent < 0.1) sentimentScore = 95;
    else if (absSent < 0.2) sentimentScore = 85;
    else if (absSent < 0.4) sentimentScore = 70;
    else if (absSent < 0.6) sentimentScore = 50;
    else if (absSent < 0.8) sentimentScore = 30;
    else sentimentScore = 15;

    factors.sentiment = sentimentScore;
    if (sentimentScore >= 80) {
        explanations.sentiment = 'The article maintains a neutral, balanced tone typical of factual reporting.';
    } else if (sentimentScore >= 50) {
        explanations.sentiment = 'The article shows moderate emotional language which may indicate bias.';
    } else {
        explanations.sentiment = 'The article uses highly emotional language, which is a common indicator of unreliable content.';
    }

    // 2. Clickbait Detection (0-100, higher = less clickbaity = more credible)
    let clickbaitMatches = 0;
    for (const pattern of CLICKBAIT_PATTERNS) {
        if (pattern.test(text)) clickbaitMatches++;
    }
    const clickbaitRatio = Math.min(clickbaitMatches / 3, 1);
    const clickbaitScore = Math.round((1 - clickbaitRatio) * 100);

    factors.clickbait = clickbaitScore;
    if (clickbaitScore >= 80) {
        explanations.clickbait = 'No significant clickbait patterns detected. Headlines appear informative.';
    } else if (clickbaitScore >= 50) {
        explanations.clickbait = `Found ${clickbaitMatches} clickbait indicator(s). Some sensational language is present.`;
    } else {
        explanations.clickbait = `Found ${clickbaitMatches} clickbait patterns. Heavy use of sensational language suggests unreliable content.`;
    }

    // 3. Language Quality (0-100)
    const allCapsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
    const excessivePunct = text.match(/[!?]{2,}/g) || [];
    const totalWords = tokens.length || 1;

    const capsRatio = allCapsWords.length / totalWords;
    const punctRatio = excessivePunct.length / Math.max(text.split(/[.!?]+/).length, 1);

    const avgWordLength = tokens.reduce((sum, w) => sum + w.length, 0) / totalWords;
    const uniqueWords = new Set(tokens).size;
    const vocabularyRichness = uniqueWords / totalWords;

    let languageScore = 80;
    if (capsRatio > 0.1) languageScore -= 25;
    else if (capsRatio > 0.05) languageScore -= 10;
    if (punctRatio > 0.3) languageScore -= 20;
    else if (punctRatio > 0.1) languageScore -= 10;
    if (avgWordLength < 3.5) languageScore -= 10;
    if (vocabularyRichness > 0.6) languageScore += 10;
    else if (vocabularyRichness < 0.3) languageScore -= 10;
    if (totalWords < 50) languageScore -= 15;
    else if (totalWords > 200) languageScore += 10;
    languageScore = Math.max(0, Math.min(100, languageScore));

    factors.language = languageScore;
    if (languageScore >= 75) {
        explanations.language = 'Good language quality with proper grammar and varied vocabulary.';
    } else if (languageScore >= 50) {
        explanations.language = 'Some language quality issues detected (excessive caps, punctuation, or limited vocabulary).';
    } else {
        explanations.language = 'Poor language quality with excessive capitalization, punctuation abuse, or very limited vocabulary — common in fake news.';
    }

    // 4. Emotional Manipulation (0-100, higher = less emotional = more credible)
    let emotionalCount = 0;
    for (const word of EMOTIONAL_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) emotionalCount += matches.length;
    }
    const emotionalRatio = emotionalCount / totalWords;
    let emotionalScore;
    if (emotionalRatio < 0.01) emotionalScore = 95;
    else if (emotionalRatio < 0.02) emotionalScore = 80;
    else if (emotionalRatio < 0.04) emotionalScore = 60;
    else if (emotionalRatio < 0.06) emotionalScore = 40;
    else emotionalScore = 20;

    factors.emotional = emotionalScore;
    if (emotionalScore >= 80) {
        explanations.emotional = 'Minimal emotional manipulation detected. The content is presented objectively.';
    } else if (emotionalScore >= 50) {
        explanations.emotional = `Found ${emotionalCount} emotionally charged words. Some emotional manipulation may be present.`;
    } else {
        explanations.emotional = `Found ${emotionalCount} emotionally charged words. High emotional manipulation — content appears designed to provoke rather than inform.`;
    }

    // 5. Source Attribution (0-100)
    let vagueCount = 0;
    for (const p of VAGUE_SOURCES) {
        if (p.test(text)) vagueCount++;
    }
    let credibleCount = 0;
    for (const p of CREDIBLE_PATTERNS) {
        if (p.test(text)) credibleCount++;
    }

    let sourceAttrScore;
    if (credibleCount >= 3 && vagueCount <= 1) sourceAttrScore = 90;
    else if (credibleCount >= 1 && vagueCount <= 2) sourceAttrScore = 70;
    else if (credibleCount === 0 && vagueCount === 0) sourceAttrScore = 50;
    else if (vagueCount > credibleCount) sourceAttrScore = 30;
    else sourceAttrScore = 50;

    factors.sourceAttribution = sourceAttrScore;
    if (sourceAttrScore >= 75) {
        explanations.sourceAttribution = `Found ${credibleCount} specific source attribution(s). Sources are well-cited.`;
    } else if (sourceAttrScore >= 50) {
        explanations.sourceAttribution = 'Limited source attribution. Consider verifying claims independently.';
    } else {
        explanations.sourceAttribution = `Found ${vagueCount} vague/anonymous source reference(s) and few credible citations. Poor source attribution is a red flag.`;
    }

    // 6. Bias Detection (0-100)
    const biasPatterns = [
        { pattern: /\b(always|never|every|all|none|nobody|everybody)\b/gi, weight: 1 },
        { pattern: /\b(obviously|clearly|undeniably|certainly|definitely|absolutely)\b/gi, weight: 1.5 },
        { pattern: /\b(must|should|need to|have to)\b/gi, weight: 0.5 },
        { pattern: /\b(leftist|rightist|liberal|conservative|socialist|fascist|communist)\b/gi, weight: 2 },
    ];

    let biasCount = 0;
    for (const { pattern, weight } of biasPatterns) {
        const matches = text.match(pattern);
        if (matches) biasCount += matches.length * weight;
    }
    const biasRatio = biasCount / totalWords;
    let biasScore;
    if (biasRatio < 0.005) biasScore = 90;
    else if (biasRatio < 0.01) biasScore = 75;
    else if (biasRatio < 0.02) biasScore = 55;
    else if (biasRatio < 0.04) biasScore = 35;
    else biasScore = 15;

    factors.bias = biasScore;
    if (biasScore >= 75) {
        explanations.bias = 'Content appears balanced with minimal absolute language or political bias indicators.';
    } else if (biasScore >= 50) {
        explanations.bias = 'Some bias indicators detected — absolute language or political labeling present.';
    } else {
        explanations.bias = 'High bias detected with frequent use of absolute statements and political labeling. Content appears highly opinionated.';
    }

    // Calculate overall score (weighted average)
    const weights = {
        sentiment: 0.15,
        clickbait: 0.15,
        language: 0.10,
        emotional: 0.20,
        sourceAttribution: 0.25,
        bias: 0.15,
    };

    let overallScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        overallScore += (factors[key] || 0) * weight;
    }
    overallScore = Math.round(overallScore);

    // AI Integration
    let aiExplanation = null;
    let aiScoreAdjustment = 0;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
        try {
            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are an expert fact checker and linguistic analyst.' },
                        { role: 'user', content: `Analyze this news article for clickbait, logical fallacies, and credibility. Provide a short 1-sentence explanation of its credibility, and a score adjustment between -15 and +15 which will be added to its base score of ${overallScore}. Reply ONLY in JSON format: {"explanation": "...", "scoreAdjustment": ...}. Article text: ${text.substring(0, 3000)}` }
                    ],
                    response_format: { type: "json_object" }
                })
            });
            
            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const aiResult = JSON.parse(aiData.choices[0].message.content);
                if (aiResult.explanation && typeof aiResult.scoreAdjustment === 'number') {
                    aiExplanation = aiResult.explanation;
                    aiScoreAdjustment = aiResult.scoreAdjustment;
                    overallScore += aiScoreAdjustment;
                    overallScore = Math.max(0, Math.min(100, overallScore));
                    factors.aiAnalysis = 50 + aiScoreAdjustment * 3; // Normalize for display
                    explanations.aiAnalysis = `AI Analysis: ${aiExplanation} (Adjusted score by ${aiScoreAdjustment>0?'+':''}${aiScoreAdjustment} points)`;
                }
            }
        } catch (err) {
            console.error('OpenAI API error:', err);
        }
    }

    // Determine verdict
    let verdict;
    if (overallScore >= 75) verdict = 'Likely Credible';
    else if (overallScore >= 50) verdict = 'Needs Verification';
    else if (overallScore >= 30) verdict = 'Suspicious';
    else verdict = 'Likely Fake';

    return {
        title: title || 'Untitled Article',
        overallScore,
        verdict,
        factors,
        explanations,
        wordCount: totalWords,
        analysisDate: new Date().toISOString(),
    };
}

function extractTitle(text) {
    const lines = text.trim().split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length < 200 && firstLine.length > 5) {
        return firstLine;
    }
    // Try to extract first sentence
    const firstSentence = text.match(/^[^.!?]+[.!?]/);
    if (firstSentence && firstSentence[0].length < 150) {
        return firstSentence[0].trim();
    }
    return text.substring(0, 80).trim() + '...';
}

export function checkSourceCredibility(db, url) {
    if (!url) return null;

    try {
        const urlObj = new URL(url);
        let domain = urlObj.hostname.replace(/^www\./, '');

        const stmt = db.prepare('SELECT * FROM sources WHERE domain = ?');
        stmt.bind([domain]);
        let source = null;
        if (stmt.step()) {
            source = stmt.getAsObject();
        }
        stmt.free();
        return source;
    } catch {
        return null;
    }
}
