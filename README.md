# MatchPulse: AI Live Cricket Companion

> Missed a few overs? MatchPulse tells you what happened, why it matters, and what to watch next, in English or Hindi.

**Live demo:** [matchpulse-kappa.vercel.app](https://matchpulse-kappa.vercel.app)
**Backend API docs:** [matchpulse-k5hq.onrender.com/docs](https://matchpulse-k5hq.onrender.com/docs)

---

## The problem

Cricket fans step away mid-match and come back to a score ticker that shows numbers but not meaning. "RR 11.2, 3 wkts" doesn't say whether the chase is on track, why the last wicket mattered, or what to watch for next. Casual fans also get lost in jargon like *death overs* and *required run rate*.

## The solution

MatchPulse turns a live scorecard into a short, plain-language story.

| Feature | What it does |
|---|---|
| **Recap** | One tap gives a 30-second summary of the chase: score, what's needed, pressure, and the last over. |
| **Live feed** | Every delivery is shown as a card. Wickets are red, sixes lime, fours white. |
| **Moment explainer** | Tap any ball to see why it mattered in the chase. |
| **Ask** | Ask questions such as "Is the chase realistic?" and get answers based on the live numbers. |
| **Hindi and English** | Switch the whole interface and all explanations with one toggle. |
| **Live ticker** | A scrolling banner shows the latest deliveries. |
| **Result banner** | When the match ends, it shows the winner and margin. |

## How it works

**Python calculates, AI explains.** The backend computes every number: run rate, required rate, balls and wickets left, the partnership, and the last-over summary. The language model only receives these facts and writes the explanation. That keeps answers grounded and stops the model from inventing scores.

```
Match feed (ball-by-ball)
        │
        ▼
FastAPI backend ── computes match state (RR, RRR, wickets, pressure)
        │
        ▼
Gemini API (optional) ── explains the moment or answers the question
        │
        ▼
React + Tailwind + Framer Motion ── Recap | Feed | Ask
```

If no API key is set, the app uses rule-based explanations, so it still works.

## Built with

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** Python, FastAPI, Pydantic, httpx
- **AI:** Google Gemini (optional)
- **Hosting:** Vercel (frontend), Render (backend)

## Safety and scope

- The model is told to answer only from the match facts and to say so when the data can't answer a question.
- Questions about fantasy teams, captains, contests, or betting are refused. MatchPulse explains what is happening in a match. It does not give betting or team advice.

## Project structure

```
matchpulse/
├── backend/
│   ├── app/
│   │   ├── main.py     # API endpoints
│   │   ├── sim.py      # ball-by-ball match feed
│   │   ├── stats.py    # run rate, required rate, pressure, partnership
│   │   └── ai.py       # Gemini calls and rule-based fallbacks
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx
        ├── i18n.js     # English and Hindi text
        └── components/ # Scoreboard, Feed, CatchUp, Ask
```

## Run locally

**Requirements:** Python 3.12, Node.js 18+

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # add your GEMINI_API_KEY (optional)
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # open http://localhost:5173
```

Press **Next ball** or **Play live** to move the match forward.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/match` | Current state and recent deliveries |
| POST | `/api/advance` | Move to the next delivery |
| POST | `/api/explain` | Explain one delivery (`index`, `lang`) |
| GET | `/api/catchup?lang=en` | 30-second recap |
| POST | `/api/ask` | Grounded Q&A (`question`, `lang`) |

## Deploy

- **Backend (Render):** Root directory `backend`. Build: `pip install -r requirements.txt`. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add `GEMINI_API_KEY` in the dashboard. Set Python to 3.12 with `.python-version`.
- **Frontend (Vercel):** Root directory `frontend`, framework Vite. Set `VITE_API_BASE` to your Render URL and redeploy after changing it.

## Limitations

- **Simulated match data.** The feed is a fictional chase, generated deterministically so the demo behaves the same every time. It isn't live cricket data.
- **Simplified cricket rules.** Extras such as wides and no-balls aren't modelled, and bowler rotation is simplified.
- **In-memory state.** The match resets when the server restarts.
- **Free hosting sleeps.** On Render's free tier, the first request after inactivity can take 30–60 seconds.

## Roadmap

- Connect a live cricket data provider through a single adapter in `backend/app/`
- Load recorded real matches for offline demos
- Add a fan mood meter from emoji reactions
- Store match state in a database

## Author

**Nikhil Mishra** · [LinkedIn](https://linkedin.com/in/nikhil-mishra-7a6bba259) · [GitHub](https://github.com/NIKHIL-MISHRA-COAT)