#!/bin/sh
set -eu

echo "Waiting for PostgreSQL..."

python - <<'PY'
import os
import time
from sqlalchemy import create_engine, text

url = os.environ["DATABASE_URL"]
engine = create_engine(url, pool_pre_ping=True)

for attempt in range(60):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("PostgreSQL is ready.")
        break
    except Exception as exc:
        if attempt == 59:
            raise
        print(f"Database not ready ({exc}); retrying...")
        time.sleep(1)
PY

echo "Seeding chocolate catalog if necessary..."
python /app/seed_catalog.py

echo "Starting ChocoCounter API..."
exec uvicorn backend:app --host 0.0.0.0 --port 8000
