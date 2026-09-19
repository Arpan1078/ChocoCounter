import json
import os
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from backend import Chocolate, Store, StoreLayout

DATABASE_URL = os.environ["DATABASE_URL"]
CATALOG_PATH = Path(os.getenv("CATALOG_PATH", "/seed/chocolates.json"))
SEED_STORE_CODE = os.getenv("SEED_STORE_CODE", "BRADLEY-FAIR")
GRID_COLUMNS = 8

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

if not CATALOG_PATH.exists():
    raise RuntimeError(f"Catalog file does not exist: {CATALOG_PATH}")

with CATALOG_PATH.open(encoding="utf-8") as file:
    catalog = json.load(file)

with Session(engine) as session:
    store = session.scalar(
        select(Store).where(Store.store_code == SEED_STORE_CODE)
    )

    if store is None:
        raise RuntimeError(
            f"Seed store {SEED_STORE_CODE!r} does not exist. "
            "Check seed.sql and SEED_STORE_CODE."
        )

    imported = 0
    layouts_created = 0

    for index, item in enumerate(catalog.get("chocolates", [])):
        chocolate_type = item.get("type", "basic")

        # User requested only these three catalog types.
        if chocolate_type not in {"basic", "seasonal", "cocoashot"}:
            continue

        chocolate_code = str(item["id"]).strip().lower()

        chocolate = session.scalar(
            select(Chocolate).where(
                Chocolate.chocolate_code == chocolate_code
            )
        )

        if chocolate is None:
            image_value = item.get("image")

            chocolate = Chocolate(
                chocolate_code=chocolate_code,
                short_name=str(item["name"])[:100],
                full_name=str(item["name"]),
                chocolate_type=chocolate_type,
                contains=item.get("contains", []),
                is_active=bool(item.get("active", True)),
                chocolate_image=image_value,
                chocolate_description=item.get("description"),
                extra_charge_cents=0,
            )

            session.add(chocolate)
            session.flush()
            imported += 1

        layout = session.get(
            StoreLayout,
            {
                "store_id": store.store_id,
                "chocolate_id": chocolate.chocolate_id,
            },
        )

        if layout is None:
            session.add(
                StoreLayout(
                    store_id=store.store_id,
                    chocolate_id=chocolate.chocolate_id,
                    display_row=index // GRID_COLUMNS,
                    display_column=index % GRID_COLUMNS,
                    is_visible=bool(item.get("active", True)),
                )
            )
            layouts_created += 1

    session.commit()

print(
    f"Catalog startup seed complete: "
    f"{imported} chocolates added, {layouts_created} layout records added."
)
