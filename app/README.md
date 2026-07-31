# StudyMate AI

**One notebook. Every subject.**

StudyMate AI is an AI-powered study companion web app that helps students generate notes, quizzes, flashcards, summaries, study plans, and more — all in one place, powered by Google's Gemini API.

🔗 **Live App:** [https://studymate-ai-3o55.onrender.com](https://studymate-ai-3o55.onrender.com)

---

## Features

### Core
- 📝 **Notes Generator** — structured study notes on any subject/topic
- ❓ **Quiz Generator** — customizable question count & difficulty level
- 🗂️ **Flashcards** — flip-to-reveal cards for quick revision
- 📄 **Summary Generator** — condense long text or topics into exam-ready summaries
- 📅 **Daily Study Planner** — multi-subject, day-wise schedule builder
- 🧒 **ELI10** — "Explain Like I'm 10" for confusing topics
- 💬 **Doubt Solver** — ask follow-up questions in a running chat thread

### Extras
- 🌙 Dark mode toggle
- 📋 One-click copy to clipboard
- ⬇️ Download outputs as PDF
- 🕘 Recent history (per section, synced to account)
- 🎤 Voice input for the doubt solver
- 📊 Export flashcards to Anki-compatible CSV / print view
- 📈 Progress tracker (activity counts + active days)
- 🔐 Compulsory login/signup — all features are gated behind an account

---

## Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **AI:** Google Gemini API (streaming responses)
- **Auth:** JWT-based authentication
- **Database:** SQLite
- **Containerization:** Docker
- **Deployment:** Render

---

## Project Structure

studymate-docker/
├── app/
│ ├── main.py # FastAPI app & routes
│ ├── auth.py # Auth logic (login/signup/JWT)
│ ├── database.py # DB setup
│ ├── models.py # DB models
│ ├── schemas.py # Pydantic schemas
│ ├── deps.py # Dependencies
│ ├── gemini_service.py # Gemini API integration
│ └── prompts.py # Prompt templates
├── static/
│ ├── index.html
│ ├── css/style.css
│ └── js/ (api.js, app.js)
├── Dockerfile
├── requirements.txt
└── .env.example

---

## Running Locally

1. Clone the repo:
```bash
   git clone https://github.com/krutichaudhary8-maker/studymate-ai.git
   cd studymate-ai
```

2. Copy `.env.example` to `.env` and add your own Gemini API key:
```bash
   cp .env.example .env
```

3. Build and run with Docker:
```bash
   docker build -t studymate-ai .
   docker run -p 8000:8000 --env-file .env studymate-ai
```

4. Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Notes

- Google Gemini's free tier allows 20 requests/day per account.
- On Render's free tier, the SQLite database resets on every redeploy.

---

## Author

Built by Kruti Chaudhary as part of a "Vibe Coding: Building & Deploying an AI Study Planner" assignment.