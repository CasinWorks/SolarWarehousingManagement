from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Component, Location, StockItem, StockMovement
from app.services import InsufficientStock, destack_out, stack_in

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")


@inventory_bp.route("/")
@login_required
def monitor():
    """Live stacking / de-stacking monitor: stock grouped by component."""
    q = request.args.get("q", "").strip()
    category = request.args.get("category", "").strip()

    query = Component.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Component.name.ilike(like), Component.sku.ilike(like)))
    if category:
        query = query.filter(Component.category == category)
    components = query.order_by(Component.category, Component.name).all()

    rows = []
    for c in components:
        stock_here = (
            StockItem.query.filter_by(component_id=c.id)
            .filter(StockItem.quantity > 0)
            .all()
        )
        rows.append(
            {
                "component": c,
                "total": c.total_stock,
                "locations": stock_here,
                "low": c.below_reorder,
            }
        )

    categories = [
        r[0]
        for r in db.session.query(Component.category)
        .filter(Component.category.isnot(None))
        .distinct()
        .all()
        if r[0]
    ]

    return render_template(
        "inventory/monitor.html",
        rows=rows,
        categories=sorted(categories),
        q=q,
        category=category,
    )


@inventory_bp.route("/movements")
@login_required
def movements():
    mtype = request.args.get("type", "").strip()
    query = StockMovement.query
    if mtype in ("IN", "OUT"):
        query = query.filter(StockMovement.movement_type == mtype)
    moves = query.order_by(StockMovement.created_at.desc()).limit(200).all()
    return render_template("inventory/movements.html", moves=moves, mtype=mtype)


@inventory_bp.route("/adjust", methods=["GET", "POST"])
@login_required
def adjust():
    """Manual stacking (IN), de-stacking (OUT) or transfer between bays."""
    if request.method == "POST":
        action = request.form.get("action")
        component_id = request.form.get("component_id")
        quantity = request.form.get("quantity")
        note = request.form.get("note", "").strip()

        try:
            component_id = int(component_id)
            quantity = int(quantity)
        except (TypeError, ValueError):
            flash("Component and quantity are required.", "danger")
            return redirect(url_for("inventory.adjust"))
        if quantity <= 0:
            flash("Quantity must be positive.", "danger")
            return redirect(url_for("inventory.adjust"))

        try:
            if action == "stack":
                loc = int(request.form.get("location_id"))
                stack_in(component_id, loc, quantity, "ADJ", current_user.id, note or "Manual stacking")
                db.session.commit()
                flash(f"Stacked {quantity} unit(s) in.", "success")
            elif action == "destack":
                loc = int(request.form.get("location_id"))
                destack_out(component_id, loc, quantity, "ADJ", current_user.id, note or "Manual de-stacking")
                db.session.commit()
                flash(f"De-stacked {quantity} unit(s) out.", "success")
            elif action == "transfer":
                src = int(request.form.get("location_id"))
                dst = int(request.form.get("dest_location_id"))
                if src == dst:
                    flash("Source and destination must differ.", "danger")
                    return redirect(url_for("inventory.adjust"))
                destack_out(component_id, src, quantity, "XFER", current_user.id, "Transfer out")
                stack_in(component_id, dst, quantity, "XFER", current_user.id, "Transfer in")
                db.session.commit()
                flash(f"Transferred {quantity} unit(s) between bays.", "success")
            else:
                flash("Unknown action.", "danger")
        except InsufficientStock as e:
            db.session.rollback()
            flash(str(e), "danger")
        return redirect(url_for("inventory.monitor"))

    return render_template(
        "inventory/adjust.html",
        components=Component.query.order_by(Component.name).all(),
        locations=Location.query.order_by(Location.code).all(),
    )
