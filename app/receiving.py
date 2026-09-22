from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.extensions import db
from app.models import (
    Component,
    Location,
    Receiving,
    ReceivingItem,
    Supplier,
)
from app.services import next_ref, stack_in

receiving_bp = Blueprint("receiving", __name__, url_prefix="/receiving")


@receiving_bp.route("/lookup-sku")
@login_required
def lookup_sku():
    """HID scanner / typed SKU → component JSON (no price for now)."""
    sku = (request.args.get("sku") or "").strip()
    if not sku:
        return jsonify({"ok": False, "error": "Scan a SKU."}), 400
    component = Component.query.filter(
        db.func.lower(Component.sku) == sku.lower()
    ).first()
    if not component:
        return jsonify({"ok": False, "error": f"No component for SKU “{sku}”."}), 404
    return jsonify(
        {
            "ok": True,
            "id": component.id,
            "sku": component.sku,
            "name": component.name,
            "category": component.category or "",
            "unit": component.unit or "pc",
            "stock": component.total_stock,
        }
    )


@receiving_bp.route("/")
@login_required
def list_receivings():
    items = Receiving.query.order_by(Receiving.created_at.desc()).all()
    return render_template("receiving/list.html", receivings=items)


@receiving_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_receiving():
    if request.method == "POST":
        rcv = Receiving(
            ref_no=next_ref(Receiving, "ref_no", "RCV"),
            supplier_id=request.form.get("supplier_id") or None,
            po_number=request.form.get("po_number", "").strip(),
            note=request.form.get("note", "").strip(),
            created_by=current_user.id,
            status="DRAFT",
        )
        db.session.add(rcv)
        db.session.flush()  # get rcv.id

        component_ids = request.form.getlist("component_id")
        location_ids = request.form.getlist("location_id")
        quantities = request.form.getlist("quantity")
        conditions = request.form.getlist("condition")

        added = 0
        for cid, lid, qty, cond in zip(
            component_ids, location_ids, quantities, conditions
        ):
            if not cid or not lid or not qty:
                continue
            try:
                qty_i = int(qty)
            except ValueError:
                continue
            if qty_i <= 0:
                continue
            db.session.add(
                ReceivingItem(
                    receiving_id=rcv.id,
                    component_id=int(cid),
                    location_id=int(lid),
                    quantity=qty_i,
                    condition=cond or "GOOD",
                )
            )
            added += 1

        if added == 0:
            db.session.rollback()
            flash("Add at least one valid line item.", "danger")
            return redirect(url_for("receiving.new_receiving"))

        db.session.commit()
        flash(f"Receiving {rcv.ref_no} saved as draft.", "success")
        return redirect(url_for("receiving.view_receiving", rcv_id=rcv.id))

    return render_template(
        "receiving/form.html",
        components=Component.query.order_by(Component.name).all(),
        locations=Location.query.order_by(Location.code).all(),
        suppliers=Supplier.query.order_by(Supplier.name).all(),
    )


@receiving_bp.route("/<int:rcv_id>")
@login_required
def view_receiving(rcv_id):
    rcv = Receiving.query.get_or_404(rcv_id)
    return render_template("receiving/detail.html", rcv=rcv)


@receiving_bp.route("/<int:rcv_id>/post", methods=["POST"])
@login_required
def post_receiving(rcv_id):
    """Post a draft: stack GOOD items into their locations."""
    rcv = Receiving.query.get_or_404(rcv_id)
    if rcv.status == "POSTED":
        flash("This receiving is already posted.", "warning")
        return redirect(url_for("receiving.view_receiving", rcv_id=rcv.id))

    stacked = 0
    for item in rcv.items:
        if item.condition == "GOOD":
            stack_in(
                component_id=item.component_id,
                location_id=item.location_id,
                quantity=item.quantity,
                reference=rcv.ref_no,
                user_id=current_user.id,
                note="Receiving intake",
            )
            stacked += item.quantity

    rcv.status = "POSTED"
    db.session.commit()
    flash(
        f"{rcv.ref_no} posted. {stacked} good unit(s) stacked into inventory.",
        "success",
    )
    return redirect(url_for("receiving.view_receiving", rcv_id=rcv.id))


# ---------------------------------------------------------------------------
# Scan In — immediate stack on each confirm (grouped under one RCV ref)
# ---------------------------------------------------------------------------
@receiving_bp.route("/scan", methods=["GET", "POST"])
@login_required
def scan_start():
    """Start a Scan In session: create receiving header, then go to scanner."""
    if request.method == "POST":
        rcv = Receiving(
            ref_no=next_ref(Receiving, "ref_no", "RCV"),
            supplier_id=request.form.get("supplier_id") or None,
            po_number=request.form.get("po_number", "").strip(),
            note=request.form.get("note", "").strip() or "Scan In",
            created_by=current_user.id,
            status="DRAFT",  # becomes POSTED as soon as first GOOD line is scanned in
        )
        db.session.add(rcv)
        db.session.commit()
        flash(f"Scan In started — {rcv.ref_no}. Scan items into a bay.", "success")
        return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

    return render_template(
        "receiving/scan_start.html",
        suppliers=Supplier.query.order_by(Supplier.name).all(),
    )


@receiving_bp.route("/scan/<int:rcv_id>", methods=["GET", "POST"])
@login_required
def scan_session(rcv_id):
    """Floor scanner: pick bay, scan SKU, confirm → stack_in immediately."""
    rcv = Receiving.query.get_or_404(rcv_id)
    locations = Location.query.order_by(Location.code).all()

    if request.method == "POST":
        sku = (request.form.get("sku") or "").strip()
        location_id = request.form.get("location_id")
        qty_raw = request.form.get("quantity") or "1"
        condition = request.form.get("condition") or "GOOD"

        try:
            location_id = int(location_id)
            qty = int(qty_raw)
        except (TypeError, ValueError):
            flash("Choose a bay and enter a valid quantity.", "danger")
            return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

        if qty <= 0:
            flash("Quantity must be at least 1.", "danger")
            return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

        if not Location.query.get(location_id):
            flash("Invalid bay selected.", "danger")
            return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

        component = Component.query.filter(
            db.func.lower(Component.sku) == sku.lower()
        ).first()
        if not component:
            flash(f"No component for SKU “{sku}”.", "danger")
            return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

        db.session.add(
            ReceivingItem(
                receiving_id=rcv.id,
                component_id=component.id,
                location_id=location_id,
                quantity=qty,
                condition=condition,
            )
        )
        if condition == "GOOD":
            stack_in(
                component_id=component.id,
                location_id=location_id,
                quantity=qty,
                reference=rcv.ref_no,
                user_id=current_user.id,
                note="Scan In",
            )
        rcv.status = "POSTED"
        db.session.commit()
        flash(
            f"Added {qty} × {component.sku} — stocked in."
            if condition == "GOOD"
            else f"Recorded {qty} × {component.sku} as damaged (not stacked).",
            "success",
        )
        return redirect(url_for("receiving.scan_session", rcv_id=rcv.id))

    return render_template(
        "receiving/scan.html",
        rcv=rcv,
        locations=locations,
        lookup_url=url_for("receiving.lookup_sku"),
    )
