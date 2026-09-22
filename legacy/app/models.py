from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


# ---------------------------------------------------------------------------
# Users & roles
# ---------------------------------------------------------------------------
ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_OPERATOR = "operator"
ROLES = [ROLE_ADMIN, ROLE_MANAGER, ROLE_OPERATOR]


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_OPERATOR)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role == ROLE_ADMIN

    @property
    def is_manager(self):
        return self.role in (ROLE_ADMIN, ROLE_MANAGER)

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------
class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(120))


class Location(db.Model):
    """A physical racking / stacking location in the warehouse."""

    __tablename__ = "locations"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    zone = db.Column(db.String(60))
    capacity = db.Column(db.Integer, default=0)  # max units this bay can stack

    def __repr__(self):
        return f"<Location {self.code}>"


class Component(db.Model):
    """A solar component type in the catalog (panel, inverter, mount, etc.)."""

    __tablename__ = "components"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(60))  # Panel, Inverter, Battery, Mounting, Cable...
    unit = db.Column(db.String(20), default="pc")
    reorder_level = db.Column(db.Integer, default=0)

    stock_items = db.relationship("StockItem", backref="component", lazy=True)

    @property
    def total_stock(self):
        return sum(si.quantity for si in self.stock_items)

    @property
    def below_reorder(self):
        return self.total_stock <= self.reorder_level


# ---------------------------------------------------------------------------
# Inventory (current stock per component per location)
# ---------------------------------------------------------------------------
class StockItem(db.Model):
    __tablename__ = "stock_items"
    __table_args__ = (
        db.UniqueConstraint("component_id", "location_id", name="uq_component_location"),
    )

    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey("components.id"), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=False)
    quantity = db.Column(db.Integer, default=0, nullable=False)

    location = db.relationship("Location")


class StockMovement(db.Model):
    """Immutable log of every stacking (IN) and de-stacking (OUT) event."""

    __tablename__ = "stock_movements"

    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey("components.id"), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=False)
    movement_type = db.Column(db.String(10), nullable=False)  # IN or OUT
    quantity = db.Column(db.Integer, nullable=False)
    reference = db.Column(db.String(80))  # e.g. RCV-0001 or DR-0001
    note = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    component = db.relationship("Component")
    location = db.relationship("Location")
    user = db.relationship("User")


# ---------------------------------------------------------------------------
# Receiving
# ---------------------------------------------------------------------------
class Receiving(db.Model):
    __tablename__ = "receivings"

    id = db.Column(db.Integer, primary_key=True)
    ref_no = db.Column(db.String(30), unique=True, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"))
    po_number = db.Column(db.String(60))
    received_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="DRAFT")  # DRAFT, POSTED
    note = db.Column(db.String(255))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    supplier = db.relationship("Supplier")
    creator = db.relationship("User")
    items = db.relationship(
        "ReceivingItem", backref="receiving", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_qty(self):
        return sum(i.quantity for i in self.items)


class ReceivingItem(db.Model):
    __tablename__ = "receiving_items"

    id = db.Column(db.Integer, primary_key=True)
    receiving_id = db.Column(db.Integer, db.ForeignKey("receivings.id"), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey("components.id"), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    condition = db.Column(db.String(20), default="GOOD")  # GOOD, DAMAGED

    component = db.relationship("Component")
    location = db.relationship("Location")


# ---------------------------------------------------------------------------
# Delivery Receipt (DR)
# ---------------------------------------------------------------------------
class DeliveryReceipt(db.Model):
    __tablename__ = "delivery_receipts"

    id = db.Column(db.Integer, primary_key=True)
    dr_no = db.Column(db.String(30), unique=True, nullable=False)
    customer_name = db.Column(db.String(160), nullable=False)
    customer_address = db.Column(db.String(255))
    project_site = db.Column(db.String(160))
    delivery_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="DRAFT")  # DRAFT, ISSUED
    note = db.Column(db.String(255))
    prepared_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    preparer = db.relationship("User")
    items = db.relationship(
        "DeliveryItem", backref="delivery", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_qty(self):
        return sum(i.quantity for i in self.items)


class DeliveryItem(db.Model):
    __tablename__ = "delivery_items"

    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey("delivery_receipts.id"), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey("components.id"), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    component = db.relationship("Component")
    location = db.relationship("Location")
