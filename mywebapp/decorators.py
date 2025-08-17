from functools import wraps
from flask import session, redirect, url_for, flash

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Bạn cần đăng nhập admin!', 'warning')
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated
