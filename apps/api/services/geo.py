"""Geographic centroids for cluster visualisation (state-level bubbles).

Approximate centroids are sufficient at national zoom; district detail is
served as a ranked list rather than pinpoints.
"""

STATE_CENTROIDS: dict[str, tuple[float, float]] = {
    "Andhra Pradesh": (15.91, 79.74),
    "Arunachal Pradesh": (28.21, 94.72),
    "Assam": (26.20, 92.93),
    "Bihar": (25.09, 85.31),
    "Chhattisgarh": (21.27, 81.86),
    "Delhi": (28.61, 77.21),
    "Goa": (15.29, 74.12),
    "Gujarat": (22.25, 71.19),
    "Haryana": (29.05, 76.08),
    "Himachal Pradesh": (31.10, 77.17),
    "Jammu & Kashmir": (33.77, 76.57),
    "Jharkhand": (23.61, 85.27),
    "Karnataka": (15.31, 75.71),
    "Kerala": (10.85, 76.27),
    "Madhya Pradesh": (23.47, 77.94),
    "Maharashtra": (19.75, 75.71),
    "Manipur": (24.66, 93.90),
    "Meghalaya": (25.46, 91.36),
    "Mizoram": (23.16, 92.93),
    "Nagaland": (26.15, 94.56),
    "Odisha": (20.95, 85.09),
    "Puducherry": (11.94, 79.80),
    "Punjab": (31.14, 75.34),
    "Rajasthan": (27.02, 74.21),
    "Sikkim": (27.53, 88.51),
    "Tamil Nadu": (11.12, 78.65),
    "Telangana": (18.11, 79.01),
    "Tripura": (23.94, 91.98),
    "Uttar Pradesh": (26.84, 80.94),
    "Uttarakhand": (30.06, 79.01),
    "West Bengal": (22.98, 87.85),
    "Chandigarh": (30.73, 76.77),
    "Ladakh": (34.22, 77.60),
    "Andaman & Nicobar": (11.74, 92.65),
    "Dadra and Nagar Haveli": (20.18, 73.01),
    "Lakshadweep": (10.57, 72.64),
}


def state_centroid(state: str | None) -> tuple[float, float] | None:
    if not state:
        return None
    s = state.strip().title()
    if s in STATE_CENTROIDS:
        return STATE_CENTROIDS[s]
    # Loose match (handles "NCT of Delhi", "Jammu and Kashmir" variants)
    for name, coords in STATE_CENTROIDS.items():
        if name.lower() in s.lower() or s.lower() in name.lower():
            return coords
    return None
