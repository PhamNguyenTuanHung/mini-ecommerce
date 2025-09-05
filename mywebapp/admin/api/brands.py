# admin/api/brands.py

from flask import jsonify, request, g
from mywebapp.admin.api import admin_api
from mywebapp import utils
from mywebapp.admin.routes import admin_required


@admin_api.route('/brands', methods=['GET'])
@admin_required
def get_brands():
    result = utils.get_brands_summary()
    return result


@admin_api.route('/brands/<int:brand_id>', methods=['DELETE'])
@admin_required
def delete_brand(brand_id):
    if utils.delete_brand(brand_id):
        utils.admin_log_activity(
            g.admin_id,
            action="delete_brand",
            message=f"Admin {g.admin_name} xóa brand {brand_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/brands/<int:brand_id>', methods=['POST'])
@admin_required
def update_brand(brand_id):
    name = request.form.get('name')
    description = request.form.get('description', '')
    if utils.update_brand(brand_id, name=name):
        utils.admin_log_activity(
            g.admin_id,
            action="update_brand",
            message=f"Admin {g.admin_name} cập nhật brand {brand_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/brands', methods=['POST'])
@admin_required
def create_brand():
    name = request.form.get('name')
    description = request.form.get('description', '')
    if utils.add_brand(name=name, description=description):
        utils.admin_log_activity(
            g.admin_id,
            action="create_brand",
            message=f"Admin {g.admin_name} tạo brand {name}"
        )
        return jsonify({"success": True})
    return jsonify({"success": False})
