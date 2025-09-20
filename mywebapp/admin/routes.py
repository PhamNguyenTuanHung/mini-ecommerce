from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, g
from mywebapp import utils


admin = Blueprint('admin', __name__, template_folder='../templates/admin')

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Bạn cần đăng nhập để truy cập', 'warning')
            return redirect(url_for('admin.login'))
        g.admin_id = session.get('admin_id')
        g.admin_name = session.get('admin_name')
        return f(*args, **kwargs)
    return decorated_function


@admin.route('/login', methods=['GET', 'POST'])
def login():
    next_page = request.args.get('next')
    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')
        next_page = request.form.get('next') or next_page

        admin_user,msg = utils.check_admin_login(username, password)
        if admin_user:
            session['admin_logged_in'] = True
            session['admin_id'] = admin_user.MaAdmin
            session['admin_name'] = admin_user.TenDangNhap

            utils.admin_log_activity(admin_user.MaAdmin,
                               action='login',
                               message=f'Admin {username} đăng nhập thành công')

            if not next_page or not next_page.startswith('/'):
                next_page = url_for('admin.dashboard')
            return redirect(next_page)
        else:
            flash(msg, 'danger')

    return render_template('admin/login.html', next=next_page)

@admin.route('/logout')
def logout():
    admin_id = session.get('admin_id')
    if admin_id:
        utils.admin_log_activity(admin_id,
                           action='logout',
                           message='Admin đã đăng xuất')

    session.pop('admin_logged_in', None)
    session.pop('admin_id', None)
    flash('Đã đăng xuất', 'success')
    return redirect(url_for('admin.login'))

@admin.route('/profile')
def profile():
    if not session.get("admin_id"):
        return redirect(url_for("admin.login"))

    admin_id = session["admin_id"]
    admin_user = utils.get_admin(admin_id)
    return render_template("profile.html",  page_name='profile',admin=admin_user)

# Dashboard chính
@admin.route('/')
@admin_required
def dashboard():
    return render_template('admin/index.html', page_name='dashboard', body_class='admin-layout')

# Quản lý sản phẩm
@admin.route('/products')
@admin_required
def products():
    # gọi utils.load_all_products() nếu cần
    categories  = utils.get_categories()
    brands = utils.get_brands()
    return render_template('products.html',
                           page_name='products',
                           body_class='product-management',
                           categories=categories,
                           brands=brands)
# Quản lý đơn hàng
@admin.route('/orders')
@admin_required
def orders():
    return render_template('orders.html', page_name='orders', body_class='order-management')

@admin.route('/users')
@admin_required
def users():
    return render_template('users.html', page_name='users', body_class='user-management')

@admin.route('/analytics')
@admin_required
def analytics():
    return render_template('analytics.html', page_name='analytics', body_class='analytics-page')


@admin.route('/categories')
@admin_required
def categories():
    return render_template('categories.html', page_name='categories', body_class='categories-page')

@admin.route('/brands')
@admin_required
def brands():
    return render_template('brands.html', page_name='brands', body_class='brands-page')

@admin.route('/reports')
@admin_required
def reports():
    return render_template('reports.html', page_name='reports', body_class='reports-page')

@admin.route('/coupons')
@admin_required
def coupons():
    return render_template('coupons.html', page_name='coupons', body_class='coupons-page')


@admin.route('/sales')
@admin_required
def sales():
    return render_template('sales.html', page_name='sales', body_class='sales-page')

