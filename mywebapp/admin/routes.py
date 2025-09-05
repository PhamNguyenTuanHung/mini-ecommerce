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

        admin_user = utils.check_admin_login(username, password)
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
            flash('Thông tin đăng nhập hoặc mật khẩu không chính xác', 'danger')

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

@admin.route('/calendar')
def calendar():
    return render_template('calendar.html', page_name='calendar', body_class='calendar-page')

@admin.route('/files')
def files():
    return render_template('files.html', page_name='files', body_class='files-page')

@admin.route('/forms')
def forms():
    return render_template('forms.html', page_name='forms', body_class='forms-page')

@admin.route('/help')
def help_page():
    return render_template('help.html', page_name='help', body_class='help-page')

@admin.route('/messages')
def messages():
    return render_template('messages.html', page_name='messages', body_class='messages-page')

@admin.route('/security')
def security():
    return render_template('security.html', page_name='security', body_class='security-page')

@admin.route('/settings')
def settings():
    return render_template('settings.html', page_name='settings', body_class='settings-page')



# Elements routes
@admin.route('/elements')
def elements():
    return render_template('elements.html', page_name='elements', body_class='elements-page')

@admin.route('/elements-alerts')
def elements_alerts():
    return render_template('elements-alerts.html', page_name='elements-alerts', body_class='elements_alerts-page')

@admin.route('/elements-badges')
def elements_badges():
    return render_template('elements-badges.html', page_name='elements-badges', body_class='elements_badges-page')

@admin.route('/elements-buttons')
def elements_buttons():
    return render_template('elements-buttons.html', page_name='elements-buttons', body_class='elements_buttons-page')

@admin.route('/elements-cards')
def elements_cards():
    return render_template('elements-cards.html', page_name='elements-cards', body_class='elements_cards-page')

@admin.route('/elements-forms')
def elements_forms():
    return render_template('elements-forms.html', page_name='elements-forms', body_class='elements_forms-page')

@admin.route('/elements-modals')
def elements_modals():
    return render_template('elements-modals.html', page_name='elements-modals', body_class='elements_modals-page')

@admin.route('/elements-tables')
def elements_tables():
    return render_template('elements-tables.html', page_name='elements-tables', body_class='elements_tables-page')


