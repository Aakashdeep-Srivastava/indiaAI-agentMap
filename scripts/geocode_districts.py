"""Build the district gazetteer from OpenStreetMap Nominatim (open data).

Geocodes every distinct (district, state) pair in the mses table exactly once
into geo_districts. Respects Nominatim's 1 req/s policy; safe to re-run
(skips pairs already geocoded).

Run:  python scripts/geocode_districts.py
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

from sqlalchemy import text  # noqa: E402
from database import engine  # noqa: E402

UA = {"User-Agent": "MSMEMate/1.0 (ONDC MSE onboarding; msmemate.com)"}
NOMINATIM = "https://nominatim.openstreetmap.org/search"


def geocode(district: str, state: str):
    q = urllib.parse.urlencode({
        "q": f"{district}, {state}, India",
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
    })
    req = urllib.request.Request(f"{NOMINATIM}?{q}", headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    if data:
        return float(data[0]["lat"]), float(data[0]["lon"])
    return None


def main():
    with engine.connect() as conn:
        pairs = conn.execute(text(
            "SELECT DISTINCT district, state FROM mses "
            "WHERE district IS NOT NULL AND state IS NOT NULL"
        )).fetchall()
        done = {
            (d, s) for d, s in conn.execute(
                text("SELECT district, state FROM geo_districts")
            ).fetchall()
        }

    todo = [(d, s) for d, s in pairs if (d, s) not in done]
    print(f"{len(pairs)} pairs total, {len(done)} done, {len(todo)} to geocode")

    ok = miss = 0
    for i, (district, state) in enumerate(todo, 1):
        try:
            coords = geocode(district, state)
        except Exception as e:
            print(f"  ! {district}, {state}: {e}")
            coords = None
            time.sleep(3)
        if coords:
            with engine.begin() as conn:
                conn.execute(text(
                    "INSERT INTO geo_districts (district, state, lat, lng) "
                    "VALUES (:d, :s, :lat, :lng) "
                    "ON CONFLICT (district, state) DO NOTHING"
                ), {"d": district, "s": state, "lat": coords[0], "lng": coords[1]})
            ok += 1
        else:
            miss += 1
        if i % 25 == 0:
            print(f"  {i}/{len(todo)} (ok={ok} miss={miss})")
        time.sleep(1.1)  # Nominatim usage policy

    print(f"Done: {ok} geocoded, {miss} not found")


if __name__ == "__main__":
    main()
