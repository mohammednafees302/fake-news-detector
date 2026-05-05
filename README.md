<div align="center">

<img src="https://img.shields.io/badge/VerifyNews-Fake%20News%20Detector-6366f1?style=for-the-badge&logo=shield&logoColor=white" alt="VerifyNews"/>

# 🛡️ VerifyNews — AI-Powered Fake News Detector

**A full-stack real-time news credibility analyzer with multi-factor NLP scoring, community reporting, a Chrome Extension, and Google Fact Check integration.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)](https://chartjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sql.js.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[🚀 Live Demo](#) · [📖 Documentation](#architecture) · [🐛 Report Bug](../../issues) · [💡 Request Feature](../../issues)

</div>

---

## 📸 Screenshots

| Home Page | Analyzer | Dashboard |
|-----------|----------|-----------|
| _Landing with live stats_ | _Multi-factor analysis results_ | _Personal analytics & charts_ |

---

## ✨ Features

### 🔍 Core Analysis Engine
- **6-factor credibility scoring** — Sentiment, Clickbait, Language Quality, Emotional Manipulation, Source Attribution, Bias Detection
- **URL scraping** — Paste any news link and the backend fetches + analyzes it automatically
- **Source credibility database** — 24+ news sources pre-rated by bias & credibility (Reuters, AP, BBC, Infowars, etc.)
- **24-hour result caching** — Same URLs return instantly from the database

### 🤖 AI Integration (Optional)
- **OpenAI GPT-3.5** — If an API key is configured, AI enhances the analysis with logical fallacy detection and natural language explanations
- **Google Fact Check API** — Cross-references articles against Snopes, PolitiFact, AFP, Reuters Fact Check, and more

### 👥 Community Features
- **User accounts** — Register, login, OTP-based password reset
- **Analysis history** — Every logged-in user gets a personal dashboard with Chart.js visualizations
- **Community reports** — Users can flag suspicious articles, upvote reports, browse the leaderboard
- **Social sharing** — Copy a shareable link to any analysis result

### 🧩 Chrome Extension
- Analyze the page you're currently reading with one click
- Displays score, verdict, and factor breakdown in a popup
- Links back to the full analysis on the web app

---

## 🏗️ Architecture

```
verifynews/
├── src/                        # React Frontend (Vite)
│   ├── pages/
│   │   ├── Home.jsx            # Landing page with live stats
│   │   ├── Analyzer.jsx        # Main analysis tool
│   │   ├── Dashboard.jsx       # User analytics
│   │   ├── Leaderboard.jsx     # Public community leaderboard
│   │   ├── Report.jsx          # Community reporting
│   │   ├── About.jsx           # Tech stack & how it works
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── ForgotPassword.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   ├── context/
│   │   └── AuthContext.jsx     # JWT-based auth state
│   └── services/
│       └── api.js              # Centralized API client
│
├── server/                     # Node.js + Express Backend
│   ├── routes/
│   │   ├── auth.js             # Register, Login, OTP Reset
│   │   ├── analyze.js          # Core analysis + caching
│   │   ├── reports.js          # Community reports
│   │   └── stats.js            # Platform & user stats
│   ├── services/
│   │   ├── analysisEngine.js   # NLP multi-factor scorer
│   │   └── urlScraper.js       # Cheerio-based web scraper
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   └── database/
│       └── init.js             # sql.js SQLite setup & seeding
│
└── extension/                  # Chrome Extension (MV3)
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    └── popup.css
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/verifynews.git
cd verifynews

# 2. Install all dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set JWT_SECRET plus any API/email keys you want to enable

# 4. Run both frontend and backend together
npm run dev:full
```

Open **http://localhost:5173** in your browser.

### Environment Variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: 5000) |
| `APP_BASE_URL` | Yes | Public frontend URL used in production links |
| `JWT_SECRET` | Yes | Strong secret for signing auth tokens |
| `EMAIL_PROVIDER` | Yes for production | `console` for local dev, `resend` for real OTP delivery |
| `RESEND_API_KEY` | Required with `EMAIL_PROVIDER=resend` | Sends password reset OTP emails |
| `EMAIL_FROM` | Required with `EMAIL_PROVIDER=resend` | Verified sender address |
| `DB_PATH` | No | Local persistent database file path |
| `BACKUP_DIR` | No | Backup output folder for `npm run backup:db` |
| `SEED_DEMO_DATA` | No | Seeds demo data locally when `true` |
| `OPENAI_API_KEY` | Optional | Enables AI-enhanced analysis |
| `GOOGLE_API_KEY` | Optional | Enables Google Fact Check cross-referencing |

### Production upgrades included

- OTP email delivery abstraction with Resend support
- JWT secret validation in production
- One-upvote-per-user enforcement with a dedicated vote table
- Login and OTP brute-force protection
- Structured request logging
- `/api/health` and `/api/ready` monitoring endpoints
- PostgreSQL-ready production configuration via `DATABASE_PROVIDER=postgres`
- Backup export script: `npm run backup:db`
- Render deployment manifest with managed Postgres wiring
- Dockerfile for container deployment
- Node test suite for auth, health, backup, and report protection

---

## 🧩 Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** and select the `extension/` folder
4. Visit any news article and click the VerifyNews icon!

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite 5 |
| Styling | Vanilla CSS with CSS Variables (Dark Mode) |
| Charts | Chart.js 4 + react-chartjs-2 |
| Backend | Node.js, Express 4 |
| Database | SQLite via sql.js (zero-config, file-based) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| NLP | natural.js, sentiment.js |
| Scraping | node-fetch + cheerio |
| AI (optional) | OpenAI API (gpt-3.5-turbo) |
| Fact Check | Google Fact Check Tools API |
| Extension | Chrome MV3 |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📊 How the Scoring Works

Each article is scored 0–100 across 6 weighted factors:

| Factor | Weight | What It Detects |
|--------|--------|-----------------|
| 🎭 Sentiment | 15% | Extreme emotional tone vs. neutral reporting |
| 🪝 Clickbait | 15% | Sensational phrases like "You won't believe..." |
| 📝 Language Quality | 10% | ALL CAPS abuse, punctuation overuse, vocabulary |
| 💔 Emotional Manipulation | 20% | Loaded words: "outrage", "scandal", "conspiracy" |
| 📑 Source Attribution | 25% | Named, specific citations vs. "sources say" |
| ⚖️ Bias Detection | 15% | Political labeling, absolute language |

> **Final Score** = Weighted average of all factors (+ optional AI adjustment ±15 pts)

---

## 🤝 Contributing

Contributions are what make the open source community amazing. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Made with ❤️ as a college project

⭐ Star this repo if you found it useful!

</div>
