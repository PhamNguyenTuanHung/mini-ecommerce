# user/api/orders.py
import uuid
from datetime import datetime
from flask import jsonify, request, session, url_for
from flask_login import login_required, current_user
from mywebapp.models import PendingOrder
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
        message=f'Xóa {len(keys_to_remove)} sản phẩm khỏi danh sách thanh toán'    )

    return jsonify({'success': True, 'checkout_items': session['checkout_items']})


@user_api.route('/orders/cod', methods=['POST'])
@login_required
def create_COD_order():
    data = request.get_json()
    order_info = data.get('order_info')
    order_details = data.get('order_details')

    # 1. Tạo đơn hàng
    new_order = utils.create_order(
        user_id=current_user.MaNguoiDung,
        order_info=order_info,
        order_details=order_details
    )

    utils.log_activity(
        current_user.MaNguoiDung,
        action='create_order_cod',
        message=f'Đặt đơn hàng COD #{new_order.MaDonHang} với {len(order_details)} sản phẩm'    )

    utils.log_activity(
        current_user.MaNguoiDung,
        action='create_order_cod',
        message=f'Đặt đơn hàng COD #{new_order.MaDonHang} với {len(order_details)} sản phẩm',
    )

    utils.log_order(
        order_id=new_order.MaDonHang,
        user_id=current_user.MaNguoiDung,
        action='create_order_cod',
        message=f'Đặt đơn hàng COD #{new_order.MaDonHang} với {len(order_details)} sản phẩm',
    )

    # 2. Tạo thanh toán COD
    utils.create_payment(
        order_id=new_order.MaDonHang,
        payment_method='COD',
        payment_status='Chưa thanh toán',
        payment_date=None
    )

    # 3. Cập nhật kho + xóa khỏi giỏ
    cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    for item in order_details:
        key = f"{item['product_id']}_{item['size']}_{item['color']}"
        quantity = item['quantity']
        utils.update_stock(key, quantity)
        cart = utils.delete_item_from_cart(cart, key)

    utils.save_cart(user_id=current_user.MaNguoiDung, cart=cart)

    # 4. Dọn session tạm nếu có
    session.pop('checkout_items', None)

    return jsonify({'success': True})


@user_api.route('/payments/momo/init', methods=['POST'])
@login_required
def init_momo_payment():
    data = request.get_json()
    order_info = data.get('order_info')
    order_details = data.get('order_details')

    momo_order_id = str(uuid.uuid4())
    print(momo_order_id)

    pending = PendingOrder(
        MaDonHangTam=momo_order_id,
        MaNguoiDung=current_user.MaNguoiDung,
        ThongTinDonHang=order_info,
        ChiTietDonHang=order_details
    )

    utils.db.session.add(pending)
    utils.db.session.commit()

    # 3. Gọi hàm tạo link thanh toán
    total_amount = order_info.get("total_amount")
    utils.log_activity(
        user_id=current_user.MaNguoiDung,
        action='init_online_payment',
        message=f'Khởi tạo thanh toán MoMo đơn #{momo_order_id}, tổng tiền {total_amount}'    )
    pay_url = utils.generate_momo_payment_url(momo_order_id, total_amount)
    print(pay_url)

    return jsonify({'success': True, 'pay_url': pay_url}) if pay_url else \
        jsonify({'success': False, 'message': 'Không tạo được URL MoMo'}), 500


@user_api.route('/api/payment/ipn', methods=['POST'])
def momo_ipn():
    data = request.get_json()
    momo_order_id = data.get("orderId")  # UUID string
    result_code = data.get("resultCode")
    print(momo_order_id)
    if result_code == 0:
        pending = PendingOrder.query.get(momo_order_id)
        if not pending:
            return jsonify({'message': 'Không tìm thấy đơn hàng tạm'}), 400

        order = utils.create_order(
            user_id=pending.MaNguoiDung,
            order_info=pending.ThongTinDonHang,
            order_details=pending.ChiTietDonHang,
            status='pending'
        )

        utils.create_payment(
            order_id=order.MaDonHang,
            payment_method="MOMO",
            payment_status="Đã thanh toán",
            payment_date=datetime.now()
        )

        # Cập nhật kho và giỏ hàng
        cart = utils.get_cart(user_id=pending.MaNguoiDung)
        for item in pending.ChiTietDonHang:
            key = f"{item['product_id']}_{item['size']}_{item['color']}"
            quantity = item['quantity']
            utils.update_stock(key, quantity)
            cart = utils.delete_item_from_cart(cart, key)
        utils.save_cart(user_id=pending.MaNguoiDung, cart=cart)

        utils.log_activity(
            user_id=pending.MaNguoiDung,
            action='payment_success',
            message=f'Thanh toán MoMo thành công đơn #{order.MaDonHang}'        )
        # Xóa bản ghi đơn tạm
        utils.db.session.delete(pending)
        utils.db.session.commit()

        return jsonify({'message': 'success'}), 200

    return jsonify({'message': 'fail'}), 400


@user_api.route('/orders', methods=['GET'])
def get_orders():
    orders = utils.get_orders_by_user_id(user_id=current_user.MaNguoiDung)
    return orders


@user_api.route("/orders/<int:order_id>/products", methods=["GET"])
@login_required
def get_order_products(order_id):
    products = utils.get_order_products_with_user_reviews(order_id=order_id,user_id=current_user.MaNguoiDung)
    return products


@user_api.route('/reviews', methods=['POST'])
def add_order_reviews():
    data = request.get_json()
    product_id = data.get("product_id")
    comment = data.get("comment")
    rating = data.get("rating")
    if utils.add_product_reviews(current_user.MaNguoiDung, product_id, comment, rating):
        utils.log_activity(user_id=current_user.MaNguoiDung,
                           action='add_order_reviews',
                           message=f'{current_user.MaNguoiDung} thêm đánh giá sản phẩm {product_id}'
                           )

    return jsonify({'success': True})


@user_api.route('/orders/<int:order_id>', methods=['POST'])
def cancel_order(order_id):
    if utils.cancel_order(order_id):
        utils.log_activity(
            user_id=current_user.MaNguoiDung,
            action='cancel_order',
            message=f'User #{current_user.MaNguoiDung} đã hủy đơn hàng #{order_id}',
        )

        utils.log_order(
            order_id=order_id,
            user_id=current_user.MaNguoiDung,
            action='cancel_order',
            message=f'User #{current_user.MaNguoiDung} đã hủy đơn hàng #{order_id}',
        )

        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 400
