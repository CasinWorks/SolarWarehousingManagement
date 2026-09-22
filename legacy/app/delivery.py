from flask import (
    Blueprint,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Component, DeliveryItem, DeliveryReceipt, Location
from app.pdf import build_delivery_receipt_pdf
from app.services import InsufficientStock, available_qty, destack_out, next_ref

delivery_bp = Blueprint("delivery", __name__, url_prefix="/delivery")


@delivery_bp.route("/lookup-sku")
@login_required
def lookup_sku():
    """HID scanner / typed SKU → component + per-bay availability."""
    sku = (request.args.get("sku") or "").strip()
    location_id = request.args.get("location_id")
    if not sku:
        return jsonify({"ok": False, "error": "Scan a SKU."}), 400
    component = Component.query.filter(
        db.func.lower(Component.sku) == sku.lower()
    ).first()
    if not component:
        return jsonify({"ok": False, "error": f"No component for SKU “{sku}”."}), 404
    available = None
    if location_id:
        try:
            available = available_qty(component.id, int(location_id))
        except (TypeError, ValueError):
            available = None
    return jsonify(
        {
            "ok": True,
            "id": component.id,
            "sku": component.sku,
            "name": component.name,
            "category": component.category or "",
            "unit": component.unit or "pc",
            "stock": component.total_stock,
            "available": available,
        }
    )


@delivery_bp.route("/")
@login_required
def list_drs():
    items = DeliveryReceipt.query.order_by(DeliveryReceipt.created_at.desc()).all()
    return render_template("delivery/list.html", drs=items)


@delivery_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_dr():
    if request.method == "POST":
        customer = request.form.get("customer_name", "").strip()
        if not customer:
            flash("Customer name is required.", "danger")
            return redirect(url_for("delivery.new_dr"))

        dr = DeliveryReceipt(
            dr_no=next_ref(DeliveryReceipt, "dr_no", "DR"),
            customer_name=customer,
            customer_address=request.form.get("customer_address", "").strip(),
            project_site=request.form.get("project_site", "").strip(),
            note=request.form.get("note", "").strip(),
            prepared_by=current_user.id,
            status="DRAFT",
        )
        db.session.add(dr)
        db.session.flush()

        component_ids = request.form.getlist("component_id")
        location_ids = request.form.getlist("location_id")
        quantities = request.form.getlist("quantity")

        added = 0
        for cid, lid, qty in zip(component_ids, location_ids, quantities):
            if not cid or not lid or not qty:
                continue
            try:
                qty_i = int(qty)
            except ValueError:
                continue
            if qty_i <= 0:
                continue
            db.session.add(
                DeliveryItem(
                    delivery_id=dr.id,
                    component_id=int(cid),
                    location_id=int(lid),
                    quantity=qty_i,
                )
            )
            added += 1

        if added == 0:
            db.session.rollback()
            flash("Add at least one valid line item.", "danger")
            return redirect(url_for("delivery.new_dr"))

        db.session.commit()
        flash(f"Delivery Receipt {dr.dr_no} saved as draft.", "success")
        return redirect(url_for("delivery.view_dr", dr_id=dr.id))

    # Build a stock map so the form can show availability per component/location
    components = Component.query.order_by(Component.name).all()
    locations = Location.query.order_by(Location.code).all()
    return render_template(
        "delivery/form.html", components=components, locations=locations
    )


@delivery_bp.route("/<int:dr_id>")
@login_required
def view_dr(dr_id):
    dr = DeliveryReceipt.query.get_or_404(dr_id)
    # annotate each item with current availability at its picked location
    avail = {
        it.id: available_qty(it.component_id, it.location_id) for it in dr.items
    }
    return render_template("delivery/detail.html", dr=dr, avail=avail)


@delivery_bp.route("/<int:dr_id>/issue", methods=["POST"])
@login_required
def issue_dr(dr_id):
    """Issue the DR: de-stack items out of inventory."""
    dr = DeliveryReceipt.query.get_or_404(dr_id)
    if dr.status == "ISSUED":
        flash("This delivery receipt is already issued.", "warning")
        return redirect(url_for("delivery.view_dr", dr_id=dr.id))

    # Validate all lines first so we never partially de-stack.
    for it in dr.items:
        have = available_qty(it.component_id, it.location_id)
        if have < it.quantity:
            flash(
                f"Cannot issue: {it.component.sku} at {it.location.code} has only "
                f"{have} unit(s), need {it.quantity}.",
                "danger",
            )
            return redirect(url_for("delivery.view_dr", dr_id=dr.id))

    try:
        for it in dr.items:
            destack_out(
                it.component_id,
                it.location_id,
                it.quantity,
                dr.dr_no,
                current_user.id,
                note=f"Delivery to {dr.customer_name}",
            )
        dr.status = "ISSUED"
        db.session.commit()
    except InsufficientStock as e:
        db.session.rollback()
        flash(str(e), "danger")
        return redirect(url_for("delivery.view_dr", dr_id=dr.id))

    flash(f"{dr.dr_no} issued and {dr.total_qty} unit(s) de-stacked.", "success")
    return redirect(url_for("delivery.view_dr", dr_id=dr.id))


@delivery_bp.route("/<int:dr_id>/pdf")
@login_required
def dr_pdf(dr_id):
    dr = DeliveryReceipt.query.get_or_404(dr_id)
    pdf = build_delivery_receipt_pdf(dr)
    return send_file(
        pdf,
        mimetype="application/pdf",
        as_attachment=False,
        download_name=f"{dr.dr_no}.pdf",
    )


# ---------------------------------------------------------------------------
# Scan Out — immediate destack on each confirm (grouped under one DR ref)
# ---------------------------------------------------------------------------
@delivery_bp.route("/scan", methods=["GET", "POST"])
@login_required
def scan_start():
    """Start a Scan Out session: customer header → scanner."""
    if request.method == "POST":
        customer = request.form.get("customer_name", "").strip()
        if not customer:
            flash("Customer name is required.", "danger")
            return redirect(url_for("delivery.scan_start"))

        dr = DeliveryReceipt(
            dr_no=next_ref(DeliveryReceipt, "dr_no", "DR"),
            customer_name=customer,
            customer_address=request.form.get("customer_address", "").strip(),
            project_site=request.form.get("project_site", "").strip(),
            note=request.form.get("note", "").strip() or "Scan Out",
            prepared_by=current_user.id,
            status="DRAFT",  # becomes ISSUED as soon as first line is scanned out
        )
        db.session.add(dr)
        db.session.commit()
        flash(f"Scan Out started — {dr.dr_no}. Scan items from a bay.", "success")
        return redirect(url_for("delivery.scan_session", dr_id=dr.id))

    return render_template("delivery/scan_start.html")


@delivery_bp.route("/scan/<int:dr_id>", methods=["GET", "POST"])
@login_required
def scan_session(dr_id):
    """Floor scanner: pick bay, scan SKU, confirm → destack_out immediately."""
    dr = DeliveryReceipt.query.get_or_404(dr_id)
    locations = Location.query.order_by(Location.code).all()

    if request.method == "POST":
        sku = (request.form.get("sku") or "").strip()
        location_id = request.form.get("location_id")
        qty_raw = request.form.get("quantity") or "1"

        try:
            location_id = int(location_id)
            qty = int(qty_raw)
        except (TypeError, ValueError):
            flash("Choose a bay and enter a valid quantity.", "danger")
            return redirect(url_for("delivery.scan_session", dr_id=dr.id))

        if qty <= 0:
            flash("Quantity must be at least 1.", "danger")
            return redirect(url_for("delivery.scan_session", dr_id=dr.id))

        if not Location.query.get(location_id):
            flash("Invalid bay selected.", "danger")
            return redirect(url_for("delivery.scan_session", dr_id=dr.id))

        component = Component.query.filter(
            db.func.lower(Component.sku) == sku.lower()
        ).first()
        if not component:
            flash(f"No component for SKU “{sku}”.", "danger")
            return redirect(url_for("delivery.scan_session", dr_id=dr.id))

        try:
            destack_out(
                component.id,
                location_id,
                qty,
                dr.dr_no,
                current_user.id,
                note=f"Scan Out to {dr.customer_name}",
            )
        except InsufficientStock as e:
            db.session.rollback()
            flash(str(e), "danger")
            return redirect(url_for("delivery.scan_session", dr_id=dr.id))

        db.session.add(
            DeliveryItem(
                delivery_id=dr.id,
                component_id=component.id,
                location_id=location_id,
                quantity=qty,
            )
        )
        dr.status = "ISSUED"
        db.session.commit()
        flash(f"Removed {qty} × {component.sku} from bay — stocked out.", "success")
        return redirect(url_for("delivery.scan_session", dr_id=dr.id))

    return render_template(
        "delivery/scan.html",
        dr=dr,
        locations=locations,
        lookup_url=url_for("delivery.lookup_sku"),
    )
