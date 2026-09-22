# SolarStock — Solar Component Management (Prototype)

A Flask web application for managing solar components across the warehouse
lifecycle: **receiving**, **inventory stacking / de-stacking monitoring**, and
**Delivery Receipt (DR) generation** with printable PDF output. Role-based
access for operators, managers, and admins.

## Features

- **Role-based login** (Flask-Login): `operator`, `manager`, `admin`.
- **Receiving** — log incoming components against a supplier/PO, mark condition
  (GOOD / DAMAGED), then *post* to stack GOOD units into inventory.
- **Inventory monitor** — live stock per component and per storage bay, low-stock
  alerts, bay utilisation, and a full stacking/de-stacking movement log.
- **Manual stack / de-stack / transfer** between bays with stock validation.
- **Delivery Receipts** — build a DR, *issue* it to de-stack inventory, and
  download a professional **PDF delivery receipt** (ReportLab).
- **Catalog** management for components, locations (bays), and suppliers.

## Quick start

```bash
cd solar_inventory
python -m venv venv && source venv/bin/activate      # optional
pip install -r requirements.txt
python seed.py          # creates solar_inventory.db with demo data
python run.py           # serves at http://127.0.0.1:5000
```

Then open http://127.0.0.1:5000 and sign in.

### Demo accounts

| Username   | Password    | Role     | Can do                                  |
|------------|-------------|----------|-----------------------------------------|
| admin      | admin123    | admin    | everything + user management            |
| manager1   | manager123  | manager  | + manage catalog (components/bays/suppliers) |
| operator1  | operator123 | operator | receiving, stacking, de-stacking, DRs   |

## Roles & permissions

- **operator** — day-to-day floor work: create/post receivings, stack &
  de-stack, create & issue delivery receipts, print DR PDFs.
- **manager** — all of the above plus add components, storage bays and suppliers.
- **admin** — all of the above plus create and manage user accounts.

## How the stock logic works

Every stacking (IN) and de-stacking (OUT) event writes an immutable
`StockMovement` row and adjusts the per-bay `StockItem` quantity. Receivings
stack stock on **Post**; delivery receipts de-stack on **Issue** (validated so
you can never de-stack more than a bay holds). This keeps the movement log as a
complete, auditable history.

## Configuration

Environment variables (all optional):

- `SECRET_KEY` — Flask session secret (set this in production).
- `DATABASE_URL` — SQLAlchemy URL (defaults to local SQLite).
- `COMPANY_NAME`, `COMPANY_ADDRESS` — printed on the Delivery Receipt PDF.

## Project layout

```
solar_inventory/
├── run.py                # entry point
├── seed.py               # demo data
├── config.py
├── requirements.txt
└── app/
    ├── __init__.py       # app factory + blueprint registration
    ├── extensions.py     # db, login_manager
    ├── models.py         # SQLAlchemy models
    ├── services.py       # stack_in / destack_out / references
    ├── auth.py           # login + roles + user admin
    ├── main.py           # dashboard
    ├── receiving.py      # receiving module
    ├── inventory.py      # stacking/de-stacking monitor
    ├── delivery.py       # delivery receipts + PDF route
    ├── catalog.py        # components / locations / suppliers
    ├── pdf.py            # ReportLab DR PDF builder
    ├── templates/
    └── static/
```

## Notes / next steps

This is a working prototype. For production you would typically add: CSRF
protection (Flask-WTF), pagination, audit trail on edits, barcode/QR scanning
for bays and components, PostgreSQL, and automated tests.
