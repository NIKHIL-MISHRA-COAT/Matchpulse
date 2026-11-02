"""All cricket arithmetic lives here. The AI never calculates these numbers;
it only receives them and explains them."""
from .sim import BATTING_TEAM, BOWLING_TEAM, TARGET, OVERS_LIMIT, BATTERS


def _overs(balls: int) -> str:
    return f"{balls // 6}.{balls % 6}"


def _batter(evs: list[dict], name: str | None):
    if not name:
        return None
    faced = [e for e in evs if e["batter"] == name]
    return {"name": name, "runs": sum(e["runs"] for e in faced), "balls": len(faced)}


def compute_state(events: list[dict], upto: int) -> dict:
    evs = events[:upto]
    balls = len(evs)
    last = evs[-1] if evs else None

    runs = last["total"] if last else 0
    wkts = last["wickets_after"] if last else 0
    balls_left = OVERS_LIMIT * 6 - balls
    need = max(TARGET - runs, 0)
    crr = round(runs * 6 / balls, 2) if balls else 0.0
    rrr = round(need * 6 / balls_left, 2) if need and balls_left > 0 else 0.0

    if runs >= TARGET:
        status = "won"
        winner = BATTING_TEAM
    elif wkts >= 10 or balls_left == 0:
        status = "lost"
        winner = BOWLING_TEAM
    else:
        status = "in_progress"
        winner = None

    if status != "in_progress":
        pressure = "over"
    elif rrr > crr + 2:
        pressure = "high"
    elif rrr > crr:
        pressure = "tightening"
    else:
        pressure = "on_track"

    last_wkt = max((i for i, e in enumerate(evs) if e["wicket"]), default=-1)
    partnership = sum(e["runs"] for e in evs[last_wkt + 1:])

    # Batting card: runs and balls for every batter who has faced a ball, best first.
    card: dict[str, dict] = {}
    for e in evs:
        b = card.setdefault(e["batter"], {"name": e["batter"], "runs": 0, "balls": 0})
        b["runs"] += e["runs"]
        b["balls"] += 1
    batting_card = sorted(card.values(), key=lambda x: (-x["runs"], x["balls"]))

    lo = evs[-6:]
    lt = evs[-12:]
    on_strike = last["on_strike_after"] if last else BATTERS[0]
    non_striker = last["non_striker_after"] if last else BATTERS[1]

    return {
        "batting_team": BATTING_TEAM,
        "bowling_team": BOWLING_TEAM,
        "target": TARGET,
        "runs": runs,
        "wickets": wkts,
        "overs": _overs(balls),
        "balls": balls,
        "balls_left": balls_left,
        "need": need,
        "crr": crr,
        "rrr": rrr,
        "projected": round(crr * OVERS_LIMIT),
        "pressure": pressure,
        "status": status,
        "winner": winner,
        "partnership_runs": partnership,
        "last_over": {"runs": sum(e["runs"] for e in lo), "wickets": sum(e["wicket"] for e in lo)},
        "last_two_overs": {"runs": sum(e["runs"] for e in lt), "wickets": sum(e["wicket"] for e in lt)},
        "on_strike": _batter(evs, on_strike),
        "non_striker": _batter(evs, non_striker),
        "batting_card": batting_card,
        "last_ball": last["commentary"] if last else "",
    }