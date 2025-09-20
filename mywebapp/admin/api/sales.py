# admin/api/coupons.py
from datetime import datetime

from flask import jsonify, request, g
from mywebapp.admin.api import admin_api
from mywebapp import utils
from mywebapp.admin.routes import admin_required


@admin_api.route('/sales', methods=['GET'])
@admin_required
def get_sales():
    result = utils.get_sales()
    return result

@admin_api.route('/sales/<int:sale_id>', methods=['POST'])
@admin_required
def update_sale(sale_id):
    name = request.form.get('name')
    discount = request.form.get('discount')

    # Chuyển từ chuỗi datetime-local sang datetime object
    start_str = request.form.get('start')
    end_str = request.form.get('end')

    start = datetime.fromisoformat(start_str) if start_str else None
    end = datetime.fromisoformat(end_str) if end_str else None

    if utils.update_sale(sale_id, name, start, discount, end):
        utils.admin_log_activity(
            g.admin_id,
            action="update_sale",
            message=f"Admin {g.admin_name} cập nhật khuyễn mãi {sale_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/sales', methods=['POST'])
@admin_required
def create_sale():
    name = request.form.get('name')
    discount = request.form.get('discount')

    # Parse datetime-local sang datetime object
    start_str = request.form.get('start')
    end_str = request.form.get('end')

    start = datetime.fromisoformat(start_str) if start_str else None
    end = datetime.fromisoformat(end_str) if end_str else None

    if utils.add_sale(name=name, discount=discount, start=start, end=end):
        utils.admin_log_activity(
            g.admin_id,
            action="CREATE_COUPON",
            message=f"Admin {g.admin_name} tạo khuyễn mãi {name}"
        )
        return jsonify({"success": True})
    return jsonify({"success": False})

@admin_api.route('/sales/assign-bulk', methods=['POST'])
def assign_sale_to_products():
    data = request.get_json()
    products = data.get("product_ids")
    sale = data.get("sale_id")

    utils.assign_sale_to_products(products, sale)
    return jsonify({"success": True})

