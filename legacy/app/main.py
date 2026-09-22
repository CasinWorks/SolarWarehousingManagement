from flask import Blueprint, render_template
from flask_login import login_required

from app.extensions import db
from app.models import (
    Component,
    DeliveryReceipt,
    Location,
    Receiving,
    StockItem,
    StockMovement,
)

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
@login_required
def dashboard():
    total_skus = Component.query.count()
    total_units = db.session.query(db.func.sum(StockItem.quantity)).scalar() or 0
    receivings = Receiving.query.count()
    drs = DeliveryReceipt.query.count()

    low_stock = [c for c in Component.query.all() if c.below_reorder]

    recent_moves = (
        StockMovement.query.order_by(StockMovement.created_at.desc()).limit(8).all()
    )

    # capacity utilisation per location
    locations = Location.query.order_by(Location.code).all()
    loc_usage = []
    for loc in locations:
        used = (
            db.session.query(db.func.sum(StockItem.quantity))
            .filter(StockItem.location_id == loc.id)
            .scalar()
            or 0
        )
        pct = round(used / loc.capacity * 100) if loc.capacity else 0
        loc_usage.append({"loc": loc, "used": used, "pct": min(pct, 100)})

    return render_template(
        "dashboard.html",
        total_skus=total_skus,
        total_units=total_units,
        receivings=receivings,
        drs=drs,
        low_stock=low_stock,
        recent_moves=recent_moves,
        loc_usage=loc_usage,
    )
