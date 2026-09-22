import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-in-production-solar-2026")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "solar_inventory.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Product branding (client-agnostic). Override per deployment via env.
    APP_NAME = os.environ.get("APP_NAME", "SolarStock Warehouse")
    COMPANY_NAME = os.environ.get("COMPANY_NAME", "SolarStock Warehouse")
    COMPANY_ADDRESS = os.environ.get(
        "COMPANY_ADDRESS", "Your warehouse address"
    )
