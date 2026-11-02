"""Deterministic ball-by-ball simulator for a fictional T20 chase.

The rest of the app only depends on the event shape produced here,
so a real cricket feed can replace this module later.
"""
import random

BATTING_TEAM = "Jaipur Kings"
BOWLING_TEAM = "Mumbai Mavericks"
FIRST_INNINGS_TOTAL = 175
TARGET = FIRST_INNINGS_TOTAL + 1      # runs needed to win
OVERS_LIMIT = 20

BATTERS = [
    "Arjun Rao", "Kabir Singh", "Dev Malhotra", "Rohan Iyer", "Sam Thakur",
    "Vikram Nair", "Aditya Shah", "Leo Fernandes", "Nikhil Verma",
    "Omar Qureshi", "Tanmay Joshi",
]
BOWLERS = ["Ravi Kulkarni", "Ayaan Mirza", "Neel Patel", "Sahil Verma", "Tom Carver"]

COMMENTARY = {
    0: "{b} to {s}, no run. Good length, defended back.",
    1: "{b} to {s}, pushed into the gap for a single.",
    2: "{b} to {s}, driven for two.",
    3: "{b} to {s}, three runs after a misfield.",
    4: "{b} to {s}, FOUR! Cracked through the covers.",
    6: "{b} to {s}, SIX! Lifted over long-on.",
}


def _roll(rng: random.Random):
    r = rng.random()
    if r < 0.06:
        return "W"
    if r < 0.41:
        return 0
    if r < 0.71:
        return 1
    if r < 0.79:
        return 2
    if r < 0.80:
        return 3
    if r < 0.92:
        return 4
    return 6


def build_match(seed: int = 11) -> list[dict]:
    rng = random.Random(seed)
    events: list[dict] = []
    runs = wkts = 0
    striker, non = 0, 1
    next_bat = 2

    for n in range(OVERS_LIMIT * 6):
        if wkts >= 10 or runs >= TARGET:
            break
        over, ball = divmod(n, 6)
        bowler = BOWLERS[over % len(BOWLERS)]
        batter = BATTERS[striker]
        out = _roll(rng)
        all_out = False

        if out == "W":
            wkts += 1
            runs_off_bat = 0
            commentary = f"{bowler} to {batter}, OUT! Big breakthrough for {BOWLING_TEAM}."
            if next_bat < len(BATTERS):
                striker = next_bat
                next_bat += 1
            else:
                all_out = True
        else:
            runs += out
            runs_off_bat = out
            commentary = COMMENTARY[out].format(b=bowler, s=batter)
            if out in (1, 3):
                striker, non = non, striker

        if ball == 5 and not all_out:      # end of over: strike changes ends
            striker, non = non, striker

        events.append({
            "id": n,
            "over": f"{over}.{ball + 1}",
            "bowler": bowler,
            "batter": batter,
            "runs": runs_off_bat,
            "wicket": out == "W",
            "commentary": commentary,
            "total": runs,
            "wickets_after": wkts,
            "on_strike_after": None if all_out else BATTERS[striker],
            "non_striker_after": BATTERS[non],
        })
    return events
