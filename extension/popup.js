const API_URL = 'http://localhost:5000/api/analyze'; // Ensure local backend is running!
const FRONTEND_URL = 'http://localhost:5173/analyze';

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    const status = document.getElementById('statusMessage');
    
    btn.disabled = true;
    status.textContent = 'Fetching current tab...';

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        status.textContent = 'Cannot analyze this type of page.';
        btn.disabled = false;
        return;
    }

    status.textContent = 'Analyzing... this may take 10 seconds...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: tab.url })
        });
        
        if (!response.ok) throw new Error('API Request Failed');
        
        const data = await response.json();
        
        document.getElementById('content').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');
        
        document.getElementById('resultTitle').textContent = data.title.substring(0, 40) + '...';
        document.getElementById('overallScore').textContent = data.overallScore;
        
        // Color based on score
        const valDiv = document.getElementById('overallScore');
        const badge = document.getElementById('verdictBadge');
        if (data.overallScore >= 75) { valDiv.style.color = '#22c55e'; badge.style.backgroundColor = 'rgba(34,197,94,0.2)'; badge.style.color = '#22c55e'; }
        else if (data.overallScore >= 50) { valDiv.style.color = '#eab308'; badge.style.backgroundColor = 'rgba(234,179,8,0.2)'; badge.style.color = '#eab308'; }
        else { valDiv.style.color = '#ef4444'; badge.style.backgroundColor = 'rgba(239,68,68,0.2)'; badge.style.color = '#ef4444'; }
        
        badge.textContent = data.verdict;
        
        document.getElementById('f_sentiment').textContent = Math.round(data.factors.sentiment);
        document.getElementById('f_clickbait').textContent = Math.round(data.factors.clickbait);
        document.getElementById('f_bias').textContent = Math.round(data.factors.bias);
        
        if (data.id) {
            document.getElementById('viewFullLink').href = `${FRONTEND_URL}/${data.id}`;
        }

    } catch (err) {
        status.textContent = 'Error: Make sure API is running.';
        btn.disabled = false;
    }
});
