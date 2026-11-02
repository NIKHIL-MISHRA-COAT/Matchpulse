# MatchPulse: AI Live Cricket Companion

A live-match companion for casual cricket fans. It explains what just happened, why it matters, and what to watch next.

- **Catch me up**: a 30-second recap for fans who stepped away.
- **Live feed**: tap any ball to get a plain-language moment explainer (English or Hindi).
- **Ask**: questions about the chase, answered from live match numbers.

Python calculates the match stats (run rate, required rate, wickets, partnership). The AI only explains those facts. Without an API key, the app uses rule-based explanations, so the demo always works.

## Run locally

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export GEMINI_API_KEY="your-key"     # optional; omit to use rule-based answers
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # opens http://localhost:5173
```

Press **Play live** or **Next ball** to move the simulated match forward.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/match` | Current match state and recent feed |
| POST | `/api/advance` | Simulate the next ball |
| POST | `/api/explain` | `{index, lang}` explain one delivery |
| GET | `/api/catchup?lang=en` | 30-second recap |
| POST | `/api/ask` | `{question, lang}` grounded Q&A |

## Design choices
- **Grounding:** the model receives computed facts only and is told not to invent numbers.
- **Scope:** no fantasy team, captain, contest, or betting advice. Questions on those topics get a refusal.
- **Simulated feed:** the match is fictional and deterministic, so the demo is reliable. The event shape is the same one a real feed would need.

## Deploy (optional)
- Frontend: Vercel (set the API base URL in `src/api.js` to your backend URL).
- Backend: Render or Railway, with `GEMINI_API_KEY` set as an environment variable.
