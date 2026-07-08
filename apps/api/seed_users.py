"""Seed / update auth users. Idempotent — safe to re-run.

Creates the `users` table (if missing) and upserts the demo accounts.
Passwords are read from env so real credentials never live in code:

    MSE_DEMO_PASSWORD   (default: bharat123)
    ADMIN_DEMO_PASSWORD (default: nsic123)

Run:  python seed_users.py
"""

import os

from database import Base, SessionLocal, User, engine
from services.auth import hash_password

DEMO_USERS = [
    {
        "username": "mse@msmemate.com",
        "password": os.getenv("MSE_DEMO_PASSWORD", "bharat123"),
        "role": "mse",
        "display_name": "Demo MSE Owner",
    },
    {
        "username": "nsic@msmemate.com",
        "password": os.getenv("ADMIN_DEMO_PASSWORD", "nsic123"),
        "role": "admin",
        "display_name": "NSIC Reviewer",
    },
]


def seed():
    # Ensure the users table exists (create_all only adds missing tables).
    Base.metadata.create_all(engine)

    db = SessionLocal()
    try:
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if existing:
                existing.hashed_password = hash_password(u["password"])
                existing.role = u["role"]
                existing.display_name = u["display_name"]
                existing.is_active = True
                existing.failed_attempts = 0
                existing.locked_until = None
                action = "updated"
            else:
                db.add(User(
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                    display_name=u["display_name"],
                    is_active=True,
                    failed_attempts=0,
                ))
                action = "created"
            print(f"  {action}: {u['username']} ({u['role']})")
        db.commit()
        print("Users seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
