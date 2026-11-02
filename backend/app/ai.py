"""LLM wrapper. Uses Gemini when GEMINI_API_KEY is set, otherwise rule-based text.
Both paths only receive facts computed in stats.py."""
import json
import os
import re

import httpx
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if present

API_KEY = os.getenv("GEMINI_API_KEY")
# Models are tried in order. GEMINI_MODEL (if set) goes first, then the defaults.
MODELS = [m for m in [os.getenv("GEMINI_MODEL"), "gemini-2.5-flash", "gemini-2.0-flash"] if m]
LAST_ERROR = {"msg": None}

BLOCKED = re.compile(
    r"\b(captain|fantasy|dream ?11|bet|betting|contest|contests|my team|who to pick|should i pick)\b",
    re.I,
)
REFUSAL = {
    "en": "I can only explain what's happening in the match. I can't advise on fantasy teams, captains, contests, or bets.",
    "hi": "मैं सिर्फ़ मैच में क्या हो रहा है यह समझा सकता हूँ। फ़ैंटेसी टीम, कैप्टन, कॉन्टेस्ट या बेट पर सलाह नहीं दे सकता।",
}
SYSTEM = (
    "You are MatchPulse, a live cricket companion for casual fans. "
    "Use ONLY the facts in MATCH FACTS. Never invent scores, players, or statistics. "
    "If the facts cannot answer the question, say so plainly. "
    "Explain cricket terms simply. Never recommend fantasy teams, captains, contests, or bets. "
    "Keep answers under 80 words."
)
LANG_RULE = {
    "en": "Reply in simple English.",
    "hi": "Reply in simple Hindi (Devanagari). Keep words like over, wicket and run rate in English where natural.",
}


async def _llm(task: str, facts: dict, lang: str) -> str | None:
    if not API_KEY:
        return None
    prompt = (
        f"{SYSTEM}\n{LANG_RULE[lang]}\n\nMATCH FACTS:\n"
        f"{json.dumps(facts, ensure_ascii=False)}\n\nTASK:\n{task}"
    )
    last_err = None
    async with httpx.AsyncClient(timeout=25) as client:
        for model in dict.fromkeys(MODELS):   # try each model once, in order
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                r = await client.post(
                    url,
                    params={"key": API_KEY},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
                    },
                )
                if r.status_code != 200:
                    last_err = f"{model}: HTTP {r.status_code}"
                    print("Gemini error:", last_err, r.text[:300])
                    continue
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                LAST_ERROR["msg"] = None
                return text
            except Exception as e:  # never print the key; only the error type
                last_err = f"{model}: {type(e).__name__}"
                print("Gemini exception:", last_err)
    LAST_ERROR["msg"] = last_err
    return None


async def _answer(task: str, facts: dict, lang: str, fallback: str) -> str:
    try:
        text = await _llm(task, facts, lang)
        if text:
            return text
    except Exception:
        pass
    return fallback


def llm_status() -> dict:
    return {
        "enabled": bool(API_KEY),
        "models": list(dict.fromkeys(MODELS)),
        "last_error": LAST_ERROR["msg"],
    }


# ---------- rule-based fallbacks (used when no API key or the call fails) ----------

PRESSURE_EN = {"high": "under high pressure", "tightening": "tightening", "on_track": "on track"}
PRESSURE_HI = {"high": "पर दबाव ज़्यादा है", "tightening": "कस रहा है", "on_track": "ठीक चल रहा है"}

# Order matters: the first matching intent wins. "next" is checked before "watch"
# so "next batter" is not treated as a question about what to watch.
INTENTS = [
    ("top", r"score[sd]? more|most runs|highest|top scor|who scored|sabse|सबसे|ज़्यादा रन|ज्यादा रन"),
    ("winner", r"winner|\bwon\b|\bwin\b|result|jeet|जीत|जीता|किसने"),
    ("strike", r"strike|\bsr\b|स्ट्राइक"),
    ("next", r"\bnext\b|who comes|next man|अगला"),
    ("batting", r"batting|at the crease|on strike|who is playing|crease|क्रीज़"),
    ("score", r"\bscore\b|scorecard|score card|runs so far|कितने रन|स्कोर"),
    ("rrr", r"required|\brrr\b|needed rate|आवश्यक"),
    ("realistic", r"realistic|possible|chance|winnable|संभव|मुमकिन"),
    ("watch", r"watch|should|focus|ध्यान|देखें"),
]


def _sr(runs: int, balls: int) -> float:
    return round(runs * 100 / balls, 1) if balls else 0.0


def _winner_line(s: dict, lang: str) -> str:
    if s["status"] == "won":
        n = 10 - s["wickets"]
        if lang == "hi":
            return f"{s['batting_team']} ने {n} विकेट से जीत दर्ज की।"
        return f"{s['batting_team']} won by {n} wickets."
    n = s["need"] - 1
    if lang == "hi":
        return f"{s['bowling_team']} ने {n} रन से जीत दर्ज की।"
    return f"{s['bowling_team']} won by {n} runs."


def _batters_line(s: dict, lang: str) -> str:
    parts = []
    for key in ("on_strike", "non_striker"):
        b = s[key]
        if b:
            parts.append(f"{b['name']} {b['runs']}({b['balls']})")
    sep = " और " if lang == "hi" else " and "
    return sep.join(parts)


def _judgement(s: dict, lang: str) -> str:
    if s["rrr"] <= s["crr"]:
        return "मौजूदा रफ़्तार से यह संभव लगता है।" if lang == "hi" else "On current pace this looks realistic."
    if s["rrr"] <= s["crr"] + 2:
        return (
            "मुश्किल है, पर विकेट बचे रहे तो संभव है।"
            if lang == "hi"
            else "It's tough, but still possible if they keep wickets in hand."
        )
    return (
        "अब यह बहुत मुश्किल है, जब तक बड़े शॉट न लगें।"
        if lang == "hi"
        else "It's very difficult from here unless they hit big shots."
    )


def _find_batter(question: str, s: dict) -> dict | None:
    """Match a batter by any part of their name in the question, e.g. 'Aditya' or 'Shah'."""
    tokens = set(re.findall(r"\w+", question.lower()))
    for b in s["batting_card"]:
        if any(part.lower() in tokens for part in b["name"].split()):
            return b
    return None


def _batter_line(b: dict, lang: str) -> str:
    sr = _sr(b["runs"], b["balls"])
    if lang == "hi":
        return f"{b['name']}: {b['runs']} रन, {b['balls']} गेंदों में, स्ट्राइक रेट {sr}।"
    return f"{b['name']}: {b['runs']} off {b['balls']} balls, strike rate {sr}."


def _fallback_catchup(s: dict, lang: str) -> str:
    if s["status"] != "in_progress":
        return _fallback_summary(s, lang)
    lo = s["last_over"]
    if lang == "hi":
        return (
            f"{s['batting_team']} {s['runs']}/{s['wickets']} पर हैं, {s['overs']} ओवर हो चुके हैं। "
            f"जीत के लिए {s['need']} रन चाहिए, {s['balls_left']} गेंदें बाकी हैं। "
            f"आवश्यक रन रेट {s['rrr']} है, मौजूदा रन रेट {s['crr']}। "
            f"चेज़ {PRESSURE_HI[s['pressure']]}। पिछले ओवर में {lo['runs']} रन और {lo['wickets']} विकेट गिरे। "
            f"मौजूदा साझेदारी {s['partnership_runs']} रन की है।"
        )
    return (
        f"{s['batting_team']} are {s['runs']}/{s['wickets']} after {s['overs']} overs. "
        f"They need {s['need']} from {s['balls_left']} balls, a required rate of {s['rrr']} against a current rate of {s['crr']}. "
        f"The chase is {PRESSURE_EN[s['pressure']]}. In the last over they scored {lo['runs']} run(s) and lost {lo['wickets']} wicket(s). "
        f"The current partnership is {s['partnership_runs']} runs."
    )


def _fallback_summary(s: dict, lang: str) -> str:
    if lang == "hi":
        base = f"{s['batting_team']} {s['runs']}/{s['wickets']} पर, {s['overs']} ओवर में।"
    else:
        base = f"{s['batting_team']} are {s['runs']}/{s['wickets']} after {s['overs']} overs."
    if s["status"] != "in_progress":
        return f"{base} {_winner_line(s, lang)}"
    if lang == "hi":
        return f"{base} जीत के लिए {s['need']} रन चाहिए, {s['balls_left']} गेंदें बाकी हैं।"
    return f"{base} They need {s['need']} from {s['balls_left']} balls."


def _fallback_explain(event: dict, s: dict, lang: str) -> str:
    bt = s["batting_team"]
    if event["wicket"]:
        if lang == "hi":
            return (f"यह अहम है क्योंकि {bt} का एक अहम विकेट गिरा। अब {10 - s['wickets']} विकेट बचे हैं "
                    f"और {s['balls_left']} गेंदें बाकी हैं।")
        return (f"This matters because {bt} lost a key wicket. They now have {10 - s['wickets']} wickets in hand "
                f"with {s['balls_left']} balls left, and the required rate is {s['rrr']}.")
    if event["runs"] >= 4:
        if lang == "hi":
            return f"चौका या छक्का चेज़ को आसान बनाता है। अब {s['need']} रन चाहिए।"
        return f"A boundary like this helps the chase a lot. They now need {s['need']} runs."
    if lang == "hi":
        return f"डॉट बॉल दबाव बनाए रखती है। {s['need']} रन चाहिए, {s['balls_left']} गेंदें बाकी हैं।"
    return (f"A dot ball keeps the pressure on. They need {s['need']} from {s['balls_left']} balls, "
            f"a required rate of {s['rrr']}.")


HELP = {
    "en": (
        "I can answer about the score, who is batting, the required rate, a batter's runs and strike rate "
        "(for example, 'Aditya strike rate'), the top scorer, whether the chase is realistic, or what to watch. "
        "Try one of those."
    ),
    "hi": (
        "मैं स्कोर, कौन बल्लेबाज़ी कर रहा है, आवश्यक रन रेट, किसी बल्लेबाज़ के रन और स्ट्राइक रेट, "
        "टॉप स्कोरर, चेज़ संभव है या नहीं, या क्या देखें, इन सवालों के जवाब दे सकता हूँ। इनमें से कोई सवाल पूछें।"
    ),
}


def _fallback_ask(question: str, s: dict, lang: str) -> str:
    hi = lang == "hi"
    q = question.lower()
    intent = next((name for name, pat in INTENTS if re.search(pat, q)), "unknown")
    over = s["status"] != "in_progress"
    batter = _find_batter(question, s)

    # A named batter: answer about that batter.
    if batter and intent in ("unknown", "score", "strike"):
        return _batter_line(batter, lang)

    if intent == "winner":
        if over:
            return _winner_line(s, lang)
        return (f"मैच जारी है। {s['batting_team']} को {s['balls_left']} गेंदों में {s['need']} रन चाहिए।"
                if hi else
                f"The match is still on. {s['batting_team']} need {s['need']} from {s['balls_left']} balls.")

    if intent == "top":
        top = s["batting_card"][:2]
        if not top:
            return "अभी तक किसी बल्लेबाज़ ने गेंद नहीं खेली है।" if hi else "No batter has faced a ball yet."
        first = top[0]
        if len(top) == 1:
            return (f"{first['name']} ने {first['runs']} रन बनाए ({first['balls']} गेंदें)।" if hi
                    else f"{first['name']} has the most runs: {first['runs']} off {first['balls']} balls.")
        second = top[1]
        if hi:
            return (f"{first['name']} ने सबसे ज़्यादा {first['runs']} रन बनाए ({first['balls']} गेंदें)। "
                    f"{second['name']} ने {second['runs']} रन बनाए ({second['balls']} गेंदें)।")
        return (f"{first['name']} has scored more: {first['runs']} off {first['balls']} balls. "
                f"{second['name']} has {second['runs']} off {second['balls']}.")

    if intent == "strike":
        top = s["batting_card"][:2]
        if not top:
            return "अभी तक किसी बल्लेबाज़ ने गेंद नहीं खेली है।" if hi else "No batter has faced a ball yet."
        parts = [f"{b['name']} {_sr(b['runs'], b['balls'])}" for b in top]
        if hi:
            return "स्ट्राइक रेट: " + ", ".join(parts) + ". नाम लिखकर किसी एक बल्लेबाज़ के बारे में भी पूछ सकते हैं।"
        return "Strike rates: " + ", ".join(parts) + ". Ask about a batter by name for their full numbers."

    if intent == "next":
        return ("मैच की फ़ीड में बल्लेबाज़ी का क्रम नहीं दिखता, इसलिए मैं अगले बल्लेबाज़ का नाम नहीं बता सकता।" if hi
                else "The feed doesn't show the batting order, so I can't tell who is next in.")

    if intent == "batting":
        if over:
            return "मैच खत्म हो चुका है, अभी कोई बल्लेबाज़ी नहीं कर रहा।" if hi else "The match is over, so no one is batting now."
        batters = _batters_line(s, lang)
        if hi:
            return f"अभी बल्लेबाज़ी में: {batters}।"
        return f"Currently batting: {batters}."

    if intent == "score":
        base = _fallback_summary(s, lang)
        batters = _batters_line(s, lang)
        if batters:
            return f"{base} {'अभी बल्लेबाज़ी में' if hi else 'Currently batting:'} {batters}."
        return base

    if intent == "rrr":
        if over:
            return ("मैच खत्म हो चुका है, इसलिए आवश्यक रन रेट अब मायने नहीं रखता।" if hi
                    else "The match is over, so the required rate no longer matters.")
        return (f"आवश्यक रन रेट {s['rrr']} है ({s['need']} रन, {s['balls_left']} गेंदें), जबकि मौजूदा रन रेट {s['crr']} है।"
                if hi else
                f"The required rate is {s['rrr']} ({s['need']} runs from {s['balls_left']} balls), "
                f"against a current rate of {s['crr']}.")

    if intent == "realistic":
        if over:
            return _winner_line(s, lang)
        return (f"{s['need']} रन {s['balls_left']} गेंदों में चाहिए, आवश्यक रन रेट {s['rrr']} बनाम मौजूदा {s['crr']}, "
                f"और {10 - s['wickets']} विकेट बचे हैं। {_judgement(s, lang)}"
                if hi else
                f"They need {s['need']} from {s['balls_left']} balls, a required rate of {s['rrr']} against "
                f"{s['crr']}, with {10 - s['wickets']} wickets in hand. {_judgement(s, lang)} "
                f"This is based on live numbers, not a prediction.")

    if intent == "watch":
        if over:
            return _winner_line(s, lang)
        return (f"अगले कुछ ओवरों पर नज़र रखें। विकेट ({10 - s['wickets']} बचे) रन रेट जितने ही अहम हैं।"
                if hi else
                f"Watch the next few overs closely. The {10 - s['wickets']} wickets in hand matter as much "
                f"as the scoring rate.")

    # Nothing matched: say so honestly and show what can be asked.
    return f"{_fallback_summary(s, lang)} {HELP[lang]}"


# ---------- public functions ----------

async def catchup(state: dict, lang: str) -> str:
    task = ("Write a 30-second recap of this chase for a fan who just came back. Cover the score, "
            "what is needed, the pressure, the last over, and one thing to watch next.")
    return await _answer(task, state, lang, _fallback_catchup(state, lang))


async def explain(event: dict, state: dict, lang: str) -> str:
    task = (f"Explain why this delivery matters for a casual fan: \"{event['commentary']}\" "
            "Say what it changed in the chase and briefly define any cricket term you use.")
    return await _answer(task, {"event": event, "state": state}, lang, _fallback_explain(event, state, lang))


async def answer(question: str, state: dict, lang: str) -> tuple[str, bool]:
    if BLOCKED.search(question):
        return REFUSAL[lang], True
    task = f"Answer this fan question using only the facts: {question}"
    return await _answer(task, state, lang, _fallback_ask(question, state, lang)), False