# admin/api/categories.py

from flask import jsonify, request
from flask_login import login_required, current_user
from mywebapp.admin.api import admin_api
from mywebapp import utils


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)

    return decorated


@admin_api.route('/categories',methods=['GET'])
def get_categories():
    result = utils.get_categories_summary()
    return result

@admin_api.route('/categories/<int:category_id>', methods=['DELETE'])
# @login_required
# @admin_required
def delete_category(order_id):
    if utils.delete_category(order_id):
        return jsonify({'success': True})
    return jsonify({'success': False})

@admin_api.route('/categories/<int:category_id>', methods=['POST'])
# @login_required
# @admin_required
def update_category(category_id):
    data = request.form.get('name')
    if utils.update_category(category_id, data):
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/categories', methods=['POST'])
# @login_required
def create_category():
    name = request.form.get('name')
    if utils.add_category(name=name):
        return jsonify({"success": True})
    return jsonify({"success": False})