"""Inventory service helpers shared by receiving, inventory and delivery modules."""

from app.extensions import db
from app.models import StockItem, StockMovement


class InsufficientStock(Exception):
    pass


def get_stock_item(component_id, location_id, create=False):
    si = StockItem.query.filter_by(
        component_id=component_id, location_id=location_id
    ).first()
    if si is None and create:
        si = StockItem(component_id=component_id, location_id=location_id, quantity=0)
        db.session.add(si)
    return si


def available_qty(component_id, location_id):
    si = get_stock_item(component_id, location_id)
    return si.quantity if si else 0


def stack_in(component_id, location_id, quantity, reference, user_id, note=None):
    """Add stock to a location (stacking / receiving)."""
    si = get_stock_item(component_id, location_id, create=True)
    si.quantity += quantity
    db.session.add(
        StockMovement(
            component_id=component_id,
            location_id=location_id,
            movement_type="IN",
            quantity=quantity,
            reference=reference,
            note=note,
            user_id=user_id,
        )
    )
    return si


def destack_out(component_id, location_id, quantity, reference, user_id, note=None):
    """Remove stock from a location (de-stacking / delivery). Raises if short."""
    si = get_stock_item(component_id, location_id)
    if si is None or si.quantity < quantity:
        have = si.quantity if si else 0
        raise InsufficientStock(
            f"Only {have} unit(s) available at this location, need {quantity}."
        )
    si.quantity -= quantity
    db.session.add(
        StockMovement(
            component_id=component_id,
            location_id=location_id,
            movement_type="OUT",
            quantity=quantity,
            reference=reference,
            note=note,
            user_id=user_id,
        )
    )
    return si


def next_ref(model, field, prefix):
    """Generate the next sequential reference like RCV-0001."""
    last = model.query.order_by(model.id.desc()).first()
    seq = (last.id + 1) if last else 1
    return f"{prefix}-{seq:04d}"
