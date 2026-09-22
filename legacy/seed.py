"""Seed the database with demo users, catalog and sample transactions.

Run:  python seed.py
"""

from app import create_app
from app.extensions import db
from app.models import (
    Component,
    DeliveryItem,
    DeliveryReceipt,
    Location,
    Receiving,
    ReceivingItem,
    Supplier,
    User,
)
from app.services import destack_out, next_ref, stack_in

app = create_app()


def run():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # --- Users -------------------------------------------------------
        users = [
            ("admin", "Danilo Montenejo", "admin", "admin123"),
            ("manager1", "Maria Santos", "manager", "manager123"),
            ("operator1", "Jose Reyes", "operator", "operator123"),
        ]
        user_objs = {}
        for username, name, role, pw in users:
            u = User(username=username, full_name=name, role=role)
            u.set_password(pw)
            db.session.add(u)
            user_objs[username] = u
        db.session.flush()
        admin = user_objs["admin"]
        op = user_objs["operator1"]

        # --- Suppliers ---------------------------------------------------
        suppliers = [
            Supplier(name="Trina Solar PH", contact_person="A. Cruz", phone="+63 917 111 2222", email="sales@trina.ph"),
            Supplier(name="Huawei FusionSolar", contact_person="L. Tan", phone="+63 918 333 4444", email="ph@huawei.com"),
            Supplier(name="Canadian Solar Distrib.", contact_person="R. Lim", phone="+63 919 555 6666", email="orders@csi.ph"),
        ]
        db.session.add_all(suppliers)

        # --- Locations ---------------------------------------------------
        locations = [
            Location(code="A-01", name="Panel Rack A1", zone="Zone A", capacity=500),
            Location(code="A-02", name="Panel Rack A2", zone="Zone A", capacity=500),
            Location(code="B-01", name="Inverter Shelf B1", zone="Zone B", capacity=120),
            Location(code="B-02", name="Battery Bay B2", zone="Zone B", capacity=80),
            Location(code="C-01", name="Mounting & BOS C1", zone="Zone C", capacity=1000),
        ]
        db.session.add_all(locations)

        # --- Components --------------------------------------------------
        components = [
            Component(sku="PNL-450M", name="Mono PERC 450W Panel", category="Panel", unit="pc", reorder_level=60),
            Component(sku="PNL-550M", name="Bifacial 550W Panel", category="Panel", unit="pc", reorder_level=40),
            Component(sku="INV-5K", name="5kW Hybrid Inverter", category="Inverter", unit="pc", reorder_level=10),
            Component(sku="INV-10K", name="10kW Three-Phase Inverter", category="Inverter", unit="pc", reorder_level=6),
            Component(sku="BAT-5KWH", name="5kWh LiFePO4 Battery", category="Battery", unit="pc", reorder_level=8),
            Component(sku="MNT-RAIL", name="Aluminum Mounting Rail 4.2m", category="Mounting", unit="pc", reorder_level=100),
            Component(sku="MNT-CLAMP", name="Mid Clamp Set", category="Mounting", unit="set", reorder_level=200),
            Component(sku="CBL-6MM", name="Solar DC Cable 6mm² (100m)", category="Cable", unit="roll", reorder_level=15),
        ]
        db.session.add_all(components)
        db.session.commit()

        c = {comp.sku: comp for comp in components}
        loc = {l.code: l for l in locations}

        # --- Receiving #1 (posted) --------------------------------------
        rcv1 = Receiving(
            ref_no=next_ref(Receiving, "ref_no", "RCV"),
            supplier_id=suppliers[0].id, po_number="PO-2026-001",
            status="POSTED", note="Initial stock load", created_by=admin.id,
        )
        db.session.add(rcv1)
        db.session.flush()
        r1_items = [
            (c["PNL-450M"], loc["A-01"], 300, "GOOD"),
            (c["PNL-550M"], loc["A-02"], 180, "GOOD"),
            (c["MNT-RAIL"], loc["C-01"], 400, "GOOD"),
            (c["MNT-CLAMP"], loc["C-01"], 600, "GOOD"),
            (c["PNL-450M"], loc["A-01"], 5, "DAMAGED"),
        ]
        for comp, l, q, cond in r1_items:
            db.session.add(ReceivingItem(receiving_id=rcv1.id, component_id=comp.id, location_id=l.id, quantity=q, condition=cond))
            if cond == "GOOD":
                stack_in(comp.id, l.id, q, rcv1.ref_no, admin.id, "Receiving intake")

        # --- Receiving #2 (posted) --------------------------------------
        rcv2 = Receiving(
            ref_no=next_ref(Receiving, "ref_no", "RCV"),
            supplier_id=suppliers[1].id, po_number="PO-2026-014",
            status="POSTED", note="Inverters & batteries", created_by=op.id,
        )
        db.session.add(rcv2)
        db.session.flush()
        r2_items = [
            (c["INV-5K"], loc["B-01"], 24, "GOOD"),
            (c["INV-10K"], loc["B-01"], 12, "GOOD"),
            (c["BAT-5KWH"], loc["B-02"], 20, "GOOD"),
            (c["CBL-6MM"], loc["C-01"], 30, "GOOD"),
        ]
        for comp, l, q, cond in r2_items:
            db.session.add(ReceivingItem(receiving_id=rcv2.id, component_id=comp.id, location_id=l.id, quantity=q, condition=cond))
            stack_in(comp.id, l.id, q, rcv2.ref_no, op.id, "Receiving intake")

        # --- Receiving #3 (draft, not yet posted) -----------------------
        rcv3 = Receiving(
            ref_no=next_ref(Receiving, "ref_no", "RCV"),
            supplier_id=suppliers[2].id, po_number="PO-2026-020",
            status="DRAFT", note="Awaiting QC", created_by=op.id,
        )
        db.session.add(rcv3)
        db.session.flush()
        db.session.add(ReceivingItem(receiving_id=rcv3.id, component_id=c["PNL-550M"].id, location_id=loc["A-02"].id, quantity=120, condition="GOOD"))
        db.session.commit()

        # --- Delivery Receipt #1 (issued -> de-stack) -------------------
        dr1 = DeliveryReceipt(
            dr_no=next_ref(DeliveryReceipt, "dr_no", "DR"),
            customer_name="Green Roof Builders Inc.",
            customer_address="12 Ortigas Ave., Pasig City",
            project_site="Pasig Commercial Rooftop 8kW",
            status="ISSUED", note="Full system kit", prepared_by=op.id,
        )
        db.session.add(dr1)
        db.session.flush()
        d1_items = [
            (c["PNL-450M"], loc["A-01"], 18),
            (c["INV-10K"], loc["B-01"], 1),
            (c["MNT-RAIL"], loc["C-01"], 40),
            (c["MNT-CLAMP"], loc["C-01"], 64),
        ]
        for comp, l, q in d1_items:
            db.session.add(DeliveryItem(delivery_id=dr1.id, component_id=comp.id, location_id=l.id, quantity=q))
            destack_out(comp.id, l.id, q, dr1.dr_no, op.id, f"Delivery to {dr1.customer_name}")

        # --- Delivery Receipt #2 (draft) --------------------------------
        dr2 = DeliveryReceipt(
            dr_no=next_ref(DeliveryReceipt, "dr_no", "DR"),
            customer_name="SunPeak Residential",
            customer_address="45 Katipunan Rd., Quezon City",
            project_site="QC Home 5kW Hybrid",
            status="DRAFT", prepared_by=op.id,
        )
        db.session.add(dr2)
        db.session.flush()
        for comp, l, q in [(c["PNL-550M"], loc["A-02"], 10), (c["INV-5K"], loc["B-01"], 1), (c["BAT-5KWH"], loc["B-02"], 2)]:
            db.session.add(DeliveryItem(delivery_id=dr2.id, component_id=comp.id, location_id=l.id, quantity=q))

        db.session.commit()
        print("Seeded database successfully.")
        print("Login with: admin/admin123, manager1/manager123, operator1/operator123")


if __name__ == "__main__":
    run()
