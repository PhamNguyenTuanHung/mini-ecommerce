# admin/api/categories.py

from flask import jsonify, request, g
from mywebapp.admin.api import admin_api
from mywebapp import utils
from mywebapp.admin.routes import admin_required


@admin_api.route('/categories',methods=['GET'])
@admin_required
def get_categories():
    result = utils.get_categories_summary()
    return result

@admin_api.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    if utils.delete_category(category_id):
        utils.admin_log_activity(
            g.admin_id,
            action="delete_category",
            message=f"Admin {g.admin_name} xóa category {category_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})

@admin_api.route('/categories/<int:category_id>', methods=['POST'])
@admin_required
def update_category(category_id):
    data = request.form.get('name')
    if utils.update_category(category_id, data):
        utils.admin_log_activity(
            g.admin_id,
            action="update_category",
            message=f"Admin {g.admin_name} tạo category {category_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/categories', methods=['POST'])
@admin_required
def create_category():
    name = request.form.get('name')
    if utils.add_category(name=name):
        utils.admin_log_activity(
            g.admin_id,
            action="CREATE_CATEGORY",
            message=f"Admin {g.admin_name} tạo category {name}"
        )
        return jsonify({"success": True})
    return jsonify({"success": False})