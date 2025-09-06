# admin/api/coupons.py

from flask import jsonify, request, g
from scripts.regsetup import description

from mywebapp.admin.api import admin_api
from mywebapp import utils
from mywebapp.admin.routes import admin_required


@admin_api.route('/coupons', methods=['GET'])
@admin_required
def get_coupons():
    result = utils.get_coupons()
    return result


# @admin_api.route('/coupons/<int:coupon_id>', methods=['DELETE'])
# @admin_required
# def delete_coupon(coupon_id):
#     if utils.delete_coupon(coupon_id):
#         utils.admin_log_activity(
#             g.admin_id,
#             action="delete_coupon",
#             message=f"Admin {g.admin_name} xóa coupon {coupon_id}"
#         )
#         return jsonify({'success': True})
#     return jsonify({'success': False})


@admin_api.route('/coupons/<int:coupon_id>', methods=['POST'])
@admin_required
def update_coupon(coupon_id):
    code = request.form.get('code')
    discount = request.form.get('discount')
    expiry_date = request.form.get('expiry_date')
    description = request.form.get('description')

    if utils.update_coupon(coupon_id, code, discount, expiry_date,description = description):
        utils.admin_log_activity(
            g.admin_id,
            action="update_coupon",
            message=f"Admin {g.admin_name} cập nhật coupon {coupon_id}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/coupons', methods=['POST'])
@admin_required
def create_coupon():
    code = request.form.get('code')
    discount = request.form.get('discount')
    expiry_date = request.form.get('expiry_date')
    description = request.form.get('description')


    if utils.add_coupon(code=code, discount=discount, expiry_date=expiry_date, description=description):
        utils.admin_log_activity(
            g.admin_id,
            action="CREATE_COUPON",
            message=f"Admin {g.admin_name} tạo coupon {code}"
        )
        return jsonify({"success": True})
    return jsonify({"success": False})

@admin_api.route('/coupons/assign-bulk', methods=['POST'])
def assign_voucher_to_users():
    data = request.get_json()
    users = data.get("user_ids")
    coupon = data.get("coupon_id")

    utils.assign_voucher_to_users(users, coupon)
    return jsonify({"success": True})

