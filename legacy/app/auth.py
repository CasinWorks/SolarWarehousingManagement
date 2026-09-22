from functools import wraps

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from app.extensions import db
from app.models import ROLE_ADMIN, ROLE_MANAGER, ROLES, User

auth_bp = Blueprint("auth", __name__)


def role_required(*roles):
    """Restrict a view to the given roles (admin always allowed)."""

    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles and not current_user.is_admin:
                flash("You do not have permission to access that page.", "danger")
                return redirect(url_for("main.dashboard"))
            return view(*args, **kwargs)

        return wrapped

    return decorator


manager_required = role_required(ROLE_MANAGER, ROLE_ADMIN)
admin_required = role_required(ROLE_ADMIN)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()
        if user and user.active and user.check_password(password):
            login_user(user)
            flash(f"Welcome back, {user.full_name}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("main.dashboard"))
        flash("Invalid username or password.", "danger")
    return render_template("login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))


# ---------------------------------------------------------------------------
# Simple user administration (admin only)
# ---------------------------------------------------------------------------
@auth_bp.route("/users")
@admin_required
def users():
    all_users = User.query.order_by(User.username).all()
    return render_template("users.html", users=all_users, roles=ROLES)


@auth_bp.route("/users/create", methods=["POST"])
@admin_required
def create_user():
    username = request.form.get("username", "").strip()
    full_name = request.form.get("full_name", "").strip()
    role = request.form.get("role", "operator")
    password = request.form.get("password", "")
    if not username or not password or not full_name:
        flash("All fields are required.", "danger")
    elif User.query.filter_by(username=username).first():
        flash("That username already exists.", "danger")
    else:
        u = User(username=username, full_name=full_name, role=role)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        flash(f"User '{username}' created.", "success")
    return redirect(url_for("auth.users"))
