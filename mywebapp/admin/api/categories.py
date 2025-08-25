# admin/api/categories.py

from flask import jsonify, request
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
        return jsonify({'success': True})
    return jsonify({'success': False})

@admin_api.route('/categories/<int:category_id>', methods=['POST'])
@admin_required
def update_category(category_id):
    data = request.form.get('name')
    if utils.update_category(category_id, data):
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/categories', methods=['POST'])
@admin_required
def create_category():
    name = request.form.get('name')
    if utils.add_category(name=name):
        return jsonify({"success": True})
    return jsonify({"success": False})