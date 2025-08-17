# admin/api/orders.py
from flask import jsonify, request, session
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


# ✔ GET /admin/api/orders
@admin_api.route('/orders', methods=['GET'])
# @login_required
# @admin_required
def get_orders():
    orders = utils.get_order_detail()
    return jsonify(orders)

@admin_api.route('/orders/<int:order_id>', methods=['GET'])
# @login_required
# @admin_required
def get_order_by_id(order_id):
    order = utils.get_order_detail_by_id(order_id)
    return jsonify(order)

@admin_api.route('/orders/<int:order_id>/cancel', methods=['POST'])
# @login_required
# @admin_required
def cancel_order(order_id):

    admin_id=session['admin_id']
    admin_name=session['admin_name']
    if utils.cancel_order(order_id):
        utils.log_activity(
            user_id= admin_id,
            action='cancel_order',
            message=f'Admin #{admin_id} đã hủy đơn hàng #{order_id}',
        )

        utils.log_order(
            order_id = order_id,
            user_id=admin_id,
            action='cancel_order',
            message=f'User #{admin_id} đã hủy đơn hàng #{order_id}',
        )

        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 400


@admin_api.route('/orders/<int:order_id>', methods=['PATCH'])
# @login_required
# @admin_required
def update_order_status(order_id):
    admin_id = session['admin_id']
    admin_name = session['admin_name']
    data = request.get_json()
    status = data.get('status')
    action = 'cancel' if status == 'cancel' else 'update'
    hanhdong = 'cập nhật' if status!='cancel' else 'hủy'
    if utils.update_order(order_id,status=status):
        utils.log_order(
            order_id=order_id,
            user_id=admin_id,
            action=action,
            message=f' admin #{admin_id} đã {hanhdong} đơn hàng #{order_id}',
        )
        return jsonify({'success': True})



@admin_api.route('/order-logs', methods=["GET"])
def get_order_logs():
    result = utils.get_order_logs()
    return result


@admin_api.route('/system-logs', methods=['GET'])
def get_system_logs():
    result = utils.get_system_logs(10)
    return result


