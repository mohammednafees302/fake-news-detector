import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function scrapeUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; VerifyNewsBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script, style, nav, footer, header elements
        $('script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, #comments').remove();

        // Extract title
        const title = $('meta[property="og:title"]').attr('content')
            || $('title').text()
            || $('h1').first().text()
            || '';

        // Extract article body
        let body = '';
        const articleSelectors = [
            'article',
            '[role="main"]',
            '.article-body',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.story-body',
            'main',
        ];

        for (const selector of articleSelectors) {
            const el = $(selector);
            if (el.length && el.text().trim().length > 100) {
                body = el.text().trim();
                break;
            }
        }

        // Fallback: get all paragraph text
        if (!body || body.length < 100) {
            body = $('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        }

        // Clean up whitespace
        body = body.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

        if (!body || body.length < 20) {
            throw new Error('Could not extract article content');
        }

        const fullText = title ? `${title}\n\n${body}` : body;

        return {
            title: title.trim(),
            body: body,
            fullText: fullText,
            url: url,
        };
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out while fetching the article');
        }
        throw new Error(`Failed to fetch article: ${err.message}`);
    }
}
