from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import login_required

from app.auth import manager_required
from app.extensions import db
from app.models import Component, Location, Supplier

catalog_bp = Blueprint("catalog", __name__, url_prefix="/catalog")


@catalog_bp.route("/components")
@login_required
def components():
    items = Component.query.order_by(Component.category, Component.name).all()
    return render_template("catalog/components.html", components=items)


@catalog_bp.route("/components/create", methods=["POST"])
@manager_required
def create_component():
    sku = request.form.get("sku", "").strip().upper()
    name = request.form.get("name", "").strip()
    category = request.form.get("category", "").strip()
    unit = request.form.get("unit", "pc").strip()
    reorder = request.form.get("reorder_level", 0)
    if not sku or not name:
        flash("SKU and name are required.", "danger")
    elif Component.query.filter_by(sku=sku).first():
        flash("That SKU already exists.", "danger")
    else:
        db.session.add(
            Component(
                sku=sku,
                name=name,
                category=category,
                unit=unit or "pc",
                reorder_level=int(reorder or 0),
            )
        )
        db.session.commit()
        flash(f"Component {sku} added.", "success")
    return redirect(url_for("catalog.components"))


@catalog_bp.route("/locations")
@login_required
def locations():
    items = Location.query.order_by(Location.code).all()
    return render_template("catalog/locations.html", locations=items)


@catalog_bp.route("/locations/create", methods=["POST"])
@manager_required
def create_location():
    code = request.form.get("code", "").strip().upper()
    name = request.form.get("name", "").strip()
    zone = request.form.get("zone", "").strip()
    capacity = request.form.get("capacity", 0)
    if not code or not name:
        flash("Code and name are required.", "danger")
    elif Location.query.filter_by(code=code).first():
        flash("That location code already exists.", "danger")
    else:
        db.session.add(
            Location(code=code, name=name, zone=zone, capacity=int(capacity or 0))
        )
        db.session.commit()
        flash(f"Location {code} added.", "success")
    return redirect(url_for("catalog.locations"))


@catalog_bp.route("/suppliers")
@login_required
def suppliers():
    items = Supplier.query.order_by(Supplier.name).all()
    return render_template("catalog/suppliers.html", suppliers=items)


@catalog_bp.route("/suppliers/create", methods=["POST"])
@manager_required
def create_supplier():
    name = request.form.get("name", "").strip()
    if not name:
        flash("Supplier name is required.", "danger")
    else:
        db.session.add(
            Supplier(
                name=name,
                contact_person=request.form.get("contact_person", "").strip(),
                phone=request.form.get("phone", "").strip(),
                email=request.form.get("email", "").strip(),
            )
        )
        db.session.commit()
        flash(f"Supplier '{name}' added.", "success")
    return redirect(url_for("catalog.suppliers"))
