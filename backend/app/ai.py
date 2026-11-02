"""LLM wrapper. Uses Gemini when GEMINI_API_KEY is set, otherwise rule-based text.
Both paths only receive facts computed in stats.py."""
import json
import os
import re

import httpx

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            url,
            params={"key": API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
            },
        )
        r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _answer(task: str, facts: dict, lang: str, fallback: str) -> str:
    try:
        text = await _llm(task, facts, lang)
        if text:
            return text
    except Exception:
        pass
    return fallback


# ---------- rule-based fallbacks (used when no API key or the call fails) ----------

PRESSURE_EN = {"high": "under high pressure", "tightening": "tightening", "on_track": "on track"}
PRESSURE_HI = {"high": "पर दबाव ज़्यादा है", "tightening": "कस रहा है", "on_track": "ठीक चल रहा है"}


def _fallback_catchup(s: dict, lang: str) -> str:
    if s["status"] != "in_progress":
        if lang == "hi":
            return f"मैच खत्म हो चुका है: {s['batting_team']} {s['runs']}/{s['wickets']} पर, {s['overs']} ओवर में।"
        return f"The chase is over: {s['batting_team']} are {s['runs']}/{s['wickets']} after {s['overs']} overs."
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


def _fallback_ask(s: dict, lang: str) -> str:
    if s["need"] <= 0:
        return "लक्ष्य पूरा हो चुका है।" if lang == "hi" else "They have already reached the target."
    if s["rrr"] <= s["crr"]:
        judge_en, judge_hi = "On current pace this looks realistic.", "मौजूदा रफ़्तार से यह संभव लगता है।"
    elif s["rrr"] <= s["crr"] + 2:
        judge_en = "It's tough, but still possible if they keep wickets in hand."
        judge_hi = "मुश्किल है, पर विकेट बचे रहे तो संभव है।"
    else:
        judge_en = "It's very difficult from here unless they hit big shots."
        judge_hi = "अब यह बहुत मुश्किल है, जब तक बड़े शॉट न लगें।"
    if lang == "hi":
        return (f"{s['need']} रन {s['balls_left']} गेंदों में चाहिए, आवश्यक रन रेट {s['rrr']} बनाम मौजूदा {s['crr']}, "
                f"और {10 - s['wickets']} विकेट बचे हैं। {judge_hi} यह लाइव आंकड़ों पर आधारित है, भविष्यवाणी नहीं।")
    return (f"They need {s['need']} from {s['balls_left']} balls, a required rate of {s['rrr']} against a current rate of "
            f"{s['crr']}, with {10 - s['wickets']} wickets in hand. {judge_en} This is based on live numbers, not a prediction.")


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
    return await _answer(task, state, lang, _fallback_ask(state, lang)), False
