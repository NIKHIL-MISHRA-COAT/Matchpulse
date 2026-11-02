from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import ai
from .sim import BATTING_TEAM, TARGET, build_match
from .stats import compute_state

# Each restart cycles to the next match situation. Seeds were chosen for distinct outcomes.
SCENARIOS = [
    {"seed": 11, "name": "Last-over thriller"},
    {"seed": 2, "name": "Comfortable chase"},
    {"seed": 16, "name": "Batting collapse"},
    {"seed": 18, "name": "Narrow defeat"},
]
STATE = {"idx": 0}
MATCH_EVENTS = build_match(SCENARIOS[0]["seed"])
LIVE = {"upto": min(60, len(MATCH_EVENTS))}   # start 10 overs into the chase

app = FastAPI(title="MatchPulse API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ExplainIn(BaseModel):
    index: int = Field(ge=0)
    lang: str = "en"


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=300)
    lang: str = "en"


def _lang(x: str) -> str:
    return x if x in ("en", "hi") else "en"


def _public(e: dict) -> dict:
    return {k: e[k] for k in ("id", "over", "batter", "bowler", "runs", "wicket", "commentary", "total")}


def _title() -> str:
    return f"{BATTING_TEAM} chasing {TARGET} · {SCENARIOS[STATE['idx']]['name']}"


@app.get("/api/health")
def health():
    return {"ok": True, "llm": ai.llm_status()}


@app.get("/api/match")
def get_match():
    upto = LIVE["upto"]
    recent = MATCH_EVENTS[:upto][-15:]
    return {
        "title": _title(),
        "state": compute_state(MATCH_EVENTS, upto),
        "feed": [_public(e) for e in reversed(recent)],
    }


@app.post("/api/advance")
def advance():
    LIVE["upto"] = min(LIVE["upto"] + 1, len(MATCH_EVENTS))
    return get_match()


@app.post("/api/reset")
def reset():
    global MATCH_EVENTS
    STATE["idx"] = (STATE["idx"] + 1) % len(SCENARIOS)
    MATCH_EVENTS = build_match(SCENARIOS[STATE["idx"]]["seed"])
    LIVE["upto"] = min(60, len(MATCH_EVENTS))
    return get_match()


@app.post("/api/explain")
async def explain(body: ExplainIn):
    if body.index >= LIVE["upto"]:
        raise HTTPException(404, "That delivery hasn't been bowled yet")
    event = MATCH_EVENTS[body.index]
    state = compute_state(MATCH_EVENTS, body.index + 1)
    return {"text": await ai.explain(event, state, _lang(body.lang))}


@app.post("/api/ask")
async def ask(body: AskIn):
    state = compute_state(MATCH_EVENTS, LIVE["upto"])
    text, refused = await ai.answer(body.question, state, _lang(body.lang))
    return {"text": text, "refused": refused}


@app.get("/api/catchup")
async def catchup(lang: str = "en"):
    state = compute_state(MATCH_EVENTS, LIVE["upto"])
    return {"text": await ai.catchup(state, _lang(lang))}