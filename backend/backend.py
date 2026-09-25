from __future__ import annotations

import csv
import io
import os
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://chococounter:chococounter_dev_password@db:5432/chococounter",
)

ENABLE_PERSISTENT_UPLOADS = os.getenv(
    "ENABLE_PERSISTENT_UPLOADS",
    "true",
).lower() in {"1", "true", "yes", "on"}

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))

if ENABLE_PERSISTENT_UPLOADS:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ENABLE_PERSISTENT_UPLOADS = os.getenv(
    "ENABLE_PERSISTENT_UPLOADS",
    "true",
).lower() in {"1", "true", "yes", "on"}

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]

# Demo prices. Change these to Cocoa Dolce-approved prices if available.
# Kept in backend code because you requested no box_types table.
BOX_BASE_PRICES_CENTS = {
    6: 1800,
    10: 2800,
    16: 4200,
    30: 7200,
    50: 11200,
}

VALID_BOX_SIZES = set(BOX_BASE_PRICES_CENTS)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

app = FastAPI(
    title="ChocoCounter API",
    version="1.0.0",
    description="Chocolate box capture, checkout, export, and analytics API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Base(DeclarativeBase):
    pass


class Store(Base):
    __tablename__ = "stores"

    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    store_code: Mapped[str] = mapped_column(Text, unique=True)
    store_name: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sales_tax: Mapped[Decimal] = mapped_column(
        Numeric(4, 2),
        default=Decimal("7.50"),
    )


class Chocolate(Base):
    __tablename__ = "chocolates"

    chocolate_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chocolate_code: Mapped[str] = mapped_column(Text, unique=True)
    short_name: Mapped[str] = mapped_column(Text, unique=True)
    full_name: Mapped[str] = mapped_column(Text, unique=True)
    chocolate_type: Mapped[str] = mapped_column(Text, default="basic")
    contains: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    chocolate_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    chocolate_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    extra_charge_cents: Mapped[int] = mapped_column(Integer, default=0)


class StoreLayout(Base):
    __tablename__ = "store_layout"

    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.store_id", ondelete="CASCADE"),
        primary_key=True,
    )
    chocolate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("chocolates.chocolate_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    display_row: Mapped[int] = mapped_column(SmallInteger)
    display_column: Mapped[int] = mapped_column(SmallInteger)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("store_id", "display_row", "display_column"),
    )


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    phone_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    rewards_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_email: Mapped[str | None] = mapped_column(Text, nullable=True)


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.customer_id", ondelete="SET NULL"),
        nullable=True,
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.store_id", ondelete="RESTRICT"),
    )
    sales_tax: Mapped[Decimal] = mapped_column(Numeric(4, 2))
    subtotal_cents: Mapped[int] = mapped_column(Integer, default=0)
    tax_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer, default=0)


class Box(Base):
    __tablename__ = "boxes"

    box_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    box_size: Mapped[int] = mapped_column(Integer)
    box_price_cents: Mapped[int] = mapped_column(Integer)
    box_total: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.order_id", ondelete="CASCADE"),
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.store_id", ondelete="RESTRICT"),
    )
    capture_seconds: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )
    image_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class BoxItem(Base):
    __tablename__ = "box_items"

    box_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    box_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boxes.box_id", ondelete="CASCADE"),
    )
    chocolate_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("chocolates.chocolate_id", ondelete="RESTRICT"),
    )
    quantity: Mapped[int] = mapped_column(SmallInteger)
    extra_charge_cents_each: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("box_id", "chocolate_id"),
    )


class ChocolateCreate(BaseModel):
    chocolate_code: str = Field(min_length=1, max_length=100)
    short_name: str = Field(min_length=1, max_length=100)
    full_name: str = Field(min_length=1, max_length=200)
    chocolate_type: Literal["basic", "seasonal", "cocoashot"] = "basic"
    contains: list[str] = Field(default_factory=list)
    is_active: bool = True
    chocolate_image: str | None = None
    chocolate_description: str | None = None
    extra_charge_cents: int = Field(default=0, ge=0)

    @field_validator("chocolate_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("chocolate_code cannot be blank")
        return normalized


class ChocolateUpdate(BaseModel):
    short_name: str | None = Field(default=None, min_length=1, max_length=100)
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    chocolate_type: Literal["basic", "seasonal", "cocoashot"] | None = None
    contains: list[str] | None = None
    is_active: bool | None = None
    chocolate_image: str | None = None
    chocolate_description: str | None = None
    extra_charge_cents: int | None = Field(default=None, ge=0)


class LayoutItem(BaseModel):
    chocolate_code: str
    display_row: int = Field(ge=0)
    display_column: int = Field(ge=0)
    is_visible: bool = True


class CheckoutItem(BaseModel):
    chocolate_code: str
    quantity: int = Field(ge=1, le=50)


class CheckoutBox(BaseModel):
    box_size: int
    pieces: list[CheckoutItem] = Field(min_length=1)
    capture_seconds: Decimal | None = Field(default=None, ge=0)
    image_filename: str | None = None


class CheckoutRequest(BaseModel):
    store_id: uuid.UUID
    boxes: list[CheckoutBox] = Field(min_length=1)
    customer_id: uuid.UUID | None = None


def calculate_tax_cents(subtotal_cents: int, sales_tax: Decimal) -> int:
    tax = (
        Decimal(subtotal_cents)
        * sales_tax
        / Decimal("100")
    ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(tax)


def chocolate_response(
    chocolate: Chocolate,
    layout: StoreLayout | None = None,
) -> dict:
    return {
        "chocolate_id": chocolate.chocolate_id,
        "chocolate_code": chocolate.chocolate_code,
        "short_name": chocolate.short_name,
        "full_name": chocolate.full_name,
        "chocolate_type": chocolate.chocolate_type,
        "contains": chocolate.contains or [],
        "is_active": chocolate.is_active,
        "chocolate_image": chocolate.chocolate_image,
        "chocolate_description": chocolate.chocolate_description,
        "extra_charge_cents": chocolate.extra_charge_cents,
        "display_row": layout.display_row if layout else None,
        "display_column": layout.display_column if layout else None,
        "is_visible": layout.is_visible if layout else False,
    }


def serialize_boxes(session) -> list[dict]:
    rows = session.execute(
        select(
            Box.box_id,
            Box.completed_at,
            Box.box_size,
            Box.box_total,
            Box.box_price_cents,
            Box.order_id,
            Box.image_filename,
            Chocolate.chocolate_code,
            Chocolate.full_name,
            BoxItem.quantity,
        )
        .join(BoxItem, BoxItem.box_id == Box.box_id)
        .join(Chocolate, Chocolate.chocolate_id == BoxItem.chocolate_id)
        .order_by(Box.completed_at.desc(), Box.box_id, Chocolate.full_name)
    ).all()

    records: dict[uuid.UUID, dict] = {}

    for row in rows:
        if row.box_id not in records:
            records[row.box_id] = {
                "box_id": str(row.box_id),
                "timestamp": row.completed_at.isoformat(),
                "box_size": row.box_size,
                "chocolate_count": row.box_total,
                "box_price_cents": row.box_price_cents,
                "order_id": str(row.order_id),
                "image_filename": row.image_filename,
                "chocolates": [],
            }

        records[row.box_id]["chocolates"].append(
            {
                "chocolate_code": row.chocolate_code,
                "chocolate_name": row.full_name,
                "quantity": row.quantity,
            }
        )

    return list(records.values())


@app.get("/api/health")
def health() -> dict:
    with SessionLocal() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/api/stores")
def stores() -> list[dict]:
    with SessionLocal() as session:
        rows = session.scalars(
            select(Store)
            .where(Store.is_active.is_(True))
            .order_by(Store.store_name)
        ).all()

        return [
            {
                "store_id": str(store.store_id),
                "store_code": store.store_code,
                "store_name": store.store_name,
                "sales_tax": str(store.sales_tax),
            }
            for store in rows
        ]


@app.get("/api/catalog/{store_id}")
def catalog(store_id: uuid.UUID) -> list[dict]:
    with SessionLocal() as session:
        store = session.get(Store, store_id)

        if store is None:
            raise HTTPException(status_code=404, detail="Store not found")

        rows = session.execute(
            select(Chocolate, StoreLayout)
            .join(
                StoreLayout,
                (StoreLayout.chocolate_id == Chocolate.chocolate_id)
                & (StoreLayout.store_id == store_id),
            )
            .where(
                Chocolate.is_active.is_(True),
                StoreLayout.is_visible.is_(True),
            )
            .order_by(StoreLayout.display_row, StoreLayout.display_column)
        ).all()

        return [
            chocolate_response(chocolate, layout)
            for chocolate, layout in rows
        ]


@app.post("/api/chocolates", status_code=201)
def create_chocolate(payload: ChocolateCreate) -> dict:
    with SessionLocal.begin() as session:
        existing = session.scalar(
            select(Chocolate).where(
                Chocolate.chocolate_code == payload.chocolate_code
            )
        )

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="chocolate_code already exists",
            )

        chocolate = Chocolate(**payload.model_dump())
        session.add(chocolate)
        session.flush()

        return chocolate_response(chocolate)


@app.patch("/api/chocolates/{chocolate_code}")
def update_chocolate(
    chocolate_code: str,
    payload: ChocolateUpdate,
) -> dict:
    updates = payload.model_dump(exclude_unset=True)

    with SessionLocal.begin() as session:
        chocolate = session.scalar(
            select(Chocolate).where(
                Chocolate.chocolate_code == chocolate_code
            )
        )

        if chocolate is None:
            raise HTTPException(
                status_code=404,
                detail="Chocolate not found",
            )

        for field_name, field_value in updates.items():
            setattr(chocolate, field_name, field_value)

        session.flush()
        return chocolate_response(chocolate)


@app.put("/api/layout/{store_id}")
def update_layout(
    store_id: uuid.UUID,
    payload: list[LayoutItem],
) -> dict:
    seen_positions: set[tuple[int, int]] = set()
    seen_codes: set[str] = set()

    for item in payload:
        position = (item.display_row, item.display_column)

        if position in seen_positions:
            raise HTTPException(
                status_code=422,
                detail="Two chocolates cannot have the same layout position",
            )

        if item.chocolate_code in seen_codes:
            raise HTTPException(
                status_code=422,
                detail="The same chocolate appears more than once",
            )

        seen_positions.add(position)
        seen_codes.add(item.chocolate_code)

    with SessionLocal.begin() as session:
        store = session.get(Store, store_id)

        if store is None:
            raise HTTPException(status_code=404, detail="Store not found")

        chocolates = session.scalars(
            select(Chocolate).where(
                Chocolate.chocolate_code.in_(seen_codes)
            )
        ).all()

        by_code = {
            chocolate.chocolate_code: chocolate
            for chocolate in chocolates
        }

        missing = seen_codes - by_code.keys()

        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown chocolate codes: {sorted(missing)}",
            )

        session.query(StoreLayout).filter(
            StoreLayout.store_id == store_id
        ).delete()

        for item in payload:
            chocolate = by_code[item.chocolate_code]

            session.add(
                StoreLayout(
                    store_id=store_id,
                    chocolate_id=chocolate.chocolate_id,
                    display_row=item.display_row,
                    display_column=item.display_column,
                    is_visible=item.is_visible,
                )
            )

    return {"saved": len(payload)}


ENABLE_PERSISTENT_UPLOADS = os.getenv(
    "ENABLE_PERSISTENT_UPLOADS",
    "true",
).lower() in {"1", "true", "yes", "on"}


@app.post("/api/uploads/box-image", status_code=201)
async def upload_box_image(file: UploadFile = File(...)) -> dict:
    if not ENABLE_PERSISTENT_UPLOADS:
        raise HTTPException(
            status_code=501,
            detail=(
                "Persistent photo uploads are disabled in this cloud deployment. "
                "Use Skip photo and continue to checkout."
            ),
        )

    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    extension = allowed_types.get(file.content_type or "")

    if extension is None:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, or WebP image",
        )

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Image file is empty")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be 10 MB or smaller",
        )

    filename = f"box_{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)

    return {"image_filename": filename}


@app.post("/api/orders/checkout", status_code=201)
def create_checkout(payload: CheckoutRequest) -> dict:
    if any(box.box_size not in VALID_BOX_SIZES for box in payload.boxes):
        raise HTTPException(
            status_code=422,
            detail=f"Supported box sizes: {sorted(VALID_BOX_SIZES)}",
        )

    with SessionLocal.begin() as session:
        store = session.get(Store, payload.store_id)

        if store is None or not store.is_active:
            raise HTTPException(
                status_code=422,
                detail="Active store not found",
            )

        if payload.customer_id is not None:
            customer = session.get(Customer, payload.customer_id)

            if customer is None:
                raise HTTPException(
                    status_code=422,
                    detail="Customer not found",
                )

        requested_codes = {
            item.chocolate_code
            for requested_box in payload.boxes
            for item in requested_box.pieces
        }

        chocolates = session.scalars(
            select(Chocolate).where(
                Chocolate.chocolate_code.in_(requested_codes),
                Chocolate.is_active.is_(True),
            )
        ).all()

        chocolate_by_code = {
            chocolate.chocolate_code: chocolate
            for chocolate in chocolates
        }

        missing_codes = requested_codes - chocolate_by_code.keys()

        if missing_codes:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Inactive or unknown chocolates: "
                    f"{sorted(missing_codes)}"
                ),
            )

        order = Order(
            store_id=store.store_id,
            customer_id=payload.customer_id,
            sales_tax=store.sales_tax,
        )
        session.add(order)
        session.flush()

        subtotal_cents = 0
        saved_boxes: list[dict] = []

        for requested_box in payload.boxes:
            quantities: dict[str, int] = defaultdict(int)

            for item in requested_box.pieces:
                quantities[item.chocolate_code] += item.quantity

            total_pieces = sum(quantities.values())

            if total_pieces != requested_box.box_size:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"{requested_box.box_size}-piece box must contain "
                        f"exactly {requested_box.box_size} pieces; "
                        f"received {total_pieces}"
                    ),
                )

            extra_charge_cents = sum(
                quantity * chocolate_by_code[code].extra_charge_cents
                for code, quantity in quantities.items()
            )

            box_price_cents = (
                BOX_BASE_PRICES_CENTS[requested_box.box_size]
                + extra_charge_cents
            )

            box = Box(
                box_size=requested_box.box_size,
                box_price_cents=box_price_cents,
                box_total=total_pieces,
                order_id=order.order_id,
                store_id=store.store_id,
                capture_seconds=requested_box.capture_seconds,
                image_filename=requested_box.image_filename,
            )
            session.add(box)
            session.flush()

            for chocolate_code, quantity in quantities.items():
                chocolate = chocolate_by_code[chocolate_code]

                session.add(
                    BoxItem(
                        box_id=box.box_id,
                        chocolate_id=chocolate.chocolate_id,
                        quantity=quantity,
                        extra_charge_cents_each=(
                            chocolate.extra_charge_cents
                        ),
                    )
                )

            subtotal_cents += box_price_cents

            saved_boxes.append(
                {
                    "box_id": str(box.box_id),
                    "box_size": box.box_size,
                    "box_total": box.box_total,
                    "box_price_cents": box.box_price_cents,
                    "image_filename": box.image_filename,
                }
            )

        tax_cents = calculate_tax_cents(
            subtotal_cents,
            store.sales_tax,
        )

        order.subtotal_cents = subtotal_cents
        order.tax_cents = tax_cents
        order.total_cents = subtotal_cents + tax_cents

        session.flush()

        return {
            "order_id": str(order.order_id),
            "order_timestamp": order.order_timestamp.isoformat(),
            "sales_tax": str(order.sales_tax),
            "subtotal_cents": order.subtotal_cents,
            "tax_cents": order.tax_cents,
            "total_cents": order.total_cents,
            "boxes": saved_boxes,
        }


@app.get("/api/boxes")
def boxes() -> list[dict]:
    with SessionLocal() as session:
        return serialize_boxes(session)


@app.get("/api/exports/boxes.json")
def export_json() -> list[dict]:
    with SessionLocal() as session:
        return serialize_boxes(session)


@app.get("/api/exports/boxes.csv")
def export_csv() -> StreamingResponse:
    with SessionLocal() as session:
        box_records = serialize_boxes(session)

    stream = io.StringIO()

    writer = csv.DictWriter(
        stream,
        fieldnames=[
            "box_id",
            "timestamp",
            "box_size",
            "chocolate_count",
            "box_price_cents",
            "order_id",
            "image_filename",
            "chocolates",
        ],
    )
    writer.writeheader()

    for box in box_records:
        writer.writerow(
            {
                "box_id": box["box_id"],
                "timestamp": box["timestamp"],
                "box_size": box["box_size"],
                "chocolate_count": box["chocolate_count"],
                "box_price_cents": box["box_price_cents"],
                "order_id": box["order_id"],
                "image_filename": box["image_filename"] or "",
                "chocolates": "; ".join(
                    (
                        f"{piece['chocolate_name']} "
                        f"x{piece['quantity']}"
                    )
                    for piece in box["chocolates"]
                ),
            }
        )

    response = StreamingResponse(
        io.BytesIO(stream.getvalue().encode("utf-8")),
        media_type="text/csv",
    )
    response.headers["Content-Disposition"] = (
        'attachment; filename="chococounter-boxes.csv"'
    )

    return response


@app.get("/api/analytics/summary")
def analytics() -> dict:
    with SessionLocal() as session:
        time_stats = session.execute(
            select(
                func.count(Box.box_id).label("box_count"),
                func.avg(Box.capture_seconds).label("average_seconds"),
                func.min(Box.capture_seconds).label("fastest_seconds"),
                func.max(Box.capture_seconds).label("slowest_seconds"),
                func.percentile_cont(0.5)
                .within_group(Box.capture_seconds)
                .label("median_seconds"),
            ).where(Box.capture_seconds.is_not(None))
        ).one()

        top_rows = session.execute(
            select(
                Chocolate.chocolate_code,
                Chocolate.full_name,
                Chocolate.chocolate_type,
                func.sum(BoxItem.quantity).label("piece_count"),
                func.count(func.distinct(BoxItem.box_id)).label(
                    "box_count"
                ),
            )
            .join(
                BoxItem,
                BoxItem.chocolate_id == Chocolate.chocolate_id,
            )
            .group_by(
                Chocolate.chocolate_code,
                Chocolate.full_name,
                Chocolate.chocolate_type,
            )
            .order_by(
                func.sum(BoxItem.quantity).desc(),
                Chocolate.full_name,
            )
            .limit(10)
        ).all()

        pairs = session.execute(
            text(
                """
                SELECT
                    c1.chocolate_code AS chocolate_a_code,
                    c1.full_name AS chocolate_a_name,
                    c2.chocolate_code AS chocolate_b_code,
                    c2.full_name AS chocolate_b_name,
                    COUNT(*) AS boxes_together
                FROM box_items bi1
                JOIN box_items bi2
                    ON bi1.box_id = bi2.box_id
                    AND bi1.chocolate_id < bi2.chocolate_id
                JOIN chocolates c1
                    ON c1.chocolate_id = bi1.chocolate_id
                JOIN chocolates c2
                    ON c2.chocolate_id = bi2.chocolate_id
                GROUP BY
                    c1.chocolate_code,
                    c1.full_name,
                    c2.chocolate_code,
                    c2.full_name
                ORDER BY
                    boxes_together DESC,
                    chocolate_a_name,
                    chocolate_b_name
                LIMIT 10
                """
            )
        ).mappings().all()

        return {
            "capture_time": {
                "box_count": time_stats.box_count,
                "average_seconds": (
                    float(time_stats.average_seconds)
                    if time_stats.average_seconds is not None
                    else None
                ),
                "median_seconds": (
                    float(time_stats.median_seconds)
                    if time_stats.median_seconds is not None
                    else None
                ),
                "fastest_seconds": (
                    float(time_stats.fastest_seconds)
                    if time_stats.fastest_seconds is not None
                    else None
                ),
                "slowest_seconds": (
                    float(time_stats.slowest_seconds)
                    if time_stats.slowest_seconds is not None
                    else None
                ),
            },
            "most_picked": [
                {
                    "chocolate_code": row.chocolate_code,
                    "chocolate_name": row.full_name,
                    "chocolate_type": row.chocolate_type,
                    "piece_count": int(row.piece_count),
                    "box_count": int(row.box_count),
                }
                for row in top_rows
            ],
            "most_paired": [
                {
                    "chocolate_a_code": row["chocolate_a_code"],
                    "chocolate_a_name": row["chocolate_a_name"],
                    "chocolate_b_code": row["chocolate_b_code"],
                    "chocolate_b_name": row["chocolate_b_name"],
                    "boxes_together": int(row["boxes_together"]),
                }
                for row in pairs
            ],
        }