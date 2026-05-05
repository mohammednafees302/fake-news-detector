const API_URL = 'https://fake-news-detector-58ty.onrender.com/predict';
const FRONTEND_URL = 'https://fake-news-detector-taupe-tau.vercel.app';

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
            body: JSON.stringify({ text: tab.url })
        });
        
        if (!response.ok) throw new Error('API Request Failed');
        
        const data = await response.json();
        
        document.getElementById('content').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');
        
       document.getElementById('resultTitle').textContent = tab.url.substring(0, 40) + '...';

document.getElementById('overallScore').textContent = (data.confidence * 100).toFixed(1) + "%";

const valDiv = document.getElementById('overallScore');
const badge = document.getElementById('verdictBadge');

badge.textContent = data.label.toUpperCase();

if (data.label === "real") {
    valDiv.style.color = '#22c55e';
    badge.style.backgroundColor = 'rgba(34,197,94,0.2)';
    badge.style.color = '#22c55e';
} else {
    valDiv.style.color = '#ef4444';
    badge.style.backgroundColor = 'rgba(239,68,68,0.2)';
    badge.style.color = '#ef4444';
}
        
        if (data.id) {
            document.getElementById('viewFullLink').href = `${FRONTEND_URL}/${data.id}`;
        }

    } catch (err) {
        status.textContent = 'Error: Make sure API is running.';
        btn.disabled = false;
    }
});
