# admin/api/orders.py

from flask import jsonify, request, session, url_for
from flask_login import login_required, current_user
from mywebapp.user.api import user_api
from mywebapp import utils


@user_api.route('/checkout/selection', methods=['POST'])
@login_required
def checkout_selected_items():
    data = request.get_json()
    selected_keys = data.get('checkout_items')

    if not selected_keys:
        return jsonify({'success': False, 'message': 'Vui lòng chọn sản phẩm.'})

    session['checkout_items'] = selected_keys
    utils.log_activity(
        current_user.MaNguoiDung,
        action='prepare_checkout',
        message=f'Chọn {len(selected_keys)} sản phẩm để thanh toán'    )
    return jsonify({
        'success': True,
        'redirect_url': url_for('main.checkout')
    })


@user_api.route('/checkout-items', methods=['POST'])
@login_required
def create_checkout_items():
    data = request.get_json()
    selected_keys = data.get('checkout_items')
    if not selected_keys:
        return jsonify({'success': False, 'message': 'Vui lòng chọn sản phẩm.'})

    session['checkout_items'] = selected_keys
    return jsonify({'success': True})

@user_api.route('/checkout-items', methods=['DELETE'])
@login_required
def delete_checkout_items():
    data = request.get_json()
    keys_to_remove = data.get('keys', [])

    if not keys_to_remove:
        return jsonify({'success': False, 'message': 'Không có key để xoá'})

    checkout_items = session.get('checkout_items', [])
    session['checkout_items'] = [k for k in checkout_items if k not in keys_to_remove]
    session.modified = True
    utils.log_activity(
        current_user.MaNguoiDung,
        action='remove_checkout_item',
        message=f'Xóa {len(keys_to_remove)} sản phẩm khỏi danh sách thanh toán',
        ip=request.remote_addr
    )

    return jsonify({'success': True, 'checkout_items': session['checkout_items']})