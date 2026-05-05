# 🤖 VerifyNews ML API (Python Microservice)

This directory contains the **Python Flask ML microservice** that powers the
real machine-learning fake news detection in VerifyNews.

## Architecture

```
React Frontend (Vite, port 5173)
        ↓
Node.js Backend (Express, port 5000)
        ↓
Python ML API (Flask, port 5001)  ← This service
        ↓
scikit-learn Model (TF-IDF + Logistic Regression)
```

## Prerequisites

- **Python 3.9+** — [Download here](https://www.python.org/downloads/)

## Setup

### 1. Install Python dependencies

```bash
# From the project root:
npm run ml:install

# Or directly:
pip install -r ml_api/requirements.txt
```

### 2. Start the ML API

```bash
# From the project root:
npm run ml:start

# Or directly:
python ml_api/app.py
```

The service will:
1. Try to load `ml_api/model.pkl` (if it exists from a previous run)
2. If not found, **auto-train** using the built-in example dataset and save `model.pkl`
3. Start listening on **http://localhost:5001**

### 3. Start everything together

```bash
npm run dev:full
```

This starts React (5173) + Node.js (5000) + Python ML API (5001) in one terminal.

---

## API Endpoints

### `GET /health`
Returns `{ "status": "ok", "model_loaded": true/false }`

### `POST /predict`
Body: `{ "text": "Article text here..." }`

Returns:
```json
{
  "label": "fake",
  "confidence": 0.87,
  "fake_probability": 0.87,
  "real_probability": 0.13,
  "suspicious_words": ["shocking", "exposed", "bombshell"],
  "top_fake_indicators": ["won t believe", "share before", "shocking"],
  "highlighted_sentences": [
    { "text": "EXPOSED: they don't want you to know!", "tag": "suspicious", "reason": "Contains: exposed, don't want you to know" },
    ...
  ],
  "reasons": [
    "Suspicious language detected: shocking, exposed",
    "No credible source attribution found"
  ],
  "model_used": "TF-IDF + Logistic Regression"
}
```

### `POST /retrain`
Forces model retraining (useful after adding new training data).

---

## Upgrading the Model

Edit `ml_api/app.py` and expand `TRAINING_DATA` with real labelled examples, or
load from a CSV/database:

```python
import pandas as pd
df = pd.read_csv("your_dataset.csv")  # columns: text, label
TRAINING_DATA = list(zip(df["text"], df["label"]))
```

Recommended public datasets:
- [LIAR Dataset](https://www.cs.ucsb.edu/~william/data/liar_dataset.zip)
- [FakeNewsNet](https://github.com/KaiDMML/FakeNewsNet)

---

## Graceful Fallback

If the Python ML API is **not running**, the Node.js backend falls back
transparently to **heuristic-only analysis** (sentiment, clickbait, bias,
language quality, source attribution). The frontend will simply not show the
ML panel.
