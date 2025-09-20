# user/api/user_info.py
from decimal import Decimal
from flask import jsonify, request, session, url_for, render_template
from flask_login import login_required, current_user
from mywebapp.user.api import user_api
from mywebapp import utils


@user_api.context_processor
def inject_cart_count():
    if current_user.is_authenticated:
        cart = utils.get_cart(current_user.MaNguoiDung)
    else:
        cart = utils.get_cart()
    cart_count = utils.count_cart(cart)
    return dict(cart=cart, cart_count=cart_count)


@user_api.route('/cart', methods=['POST'])
def create_cart_item():
    data = request.get_json()
    product_id = data.get('id')
    quantity = int(data.get('quantity', 1))
    color = data.get('color')
    size = data.get('size')
    image =data.get('image')

    ok, result = utils.check_stock(product_id, size, color, quantity)
    if not ok:
        return jsonify({'error': result}), 400

    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})

    cart = utils.add_item_to_cart(cart, data)
    if current_user.is_authenticated:
        utils.log_activity(
            current_user.MaNguoiDung,
            action='cart_add',
            message=f'Thêm sản phẩm ID={product_id}, Màu={color}, Size={size}, SL={quantity} vào giỏ hàng'        )
        utils.save_cart(user_id=current_user.MaNguoiDung, cart=cart)
    else:
        session['cart'] = cart

    stats = utils.count_cart(cart)
    mini_cart_html = render_template('partials/mini_cart.html', cart=cart)

    return jsonify({
        'success': True,
        'total_amount': stats['total_amount'],
        'total_quantity': stats['total_quantity'],
        'mini_cart_html': mini_cart_html
    })

@user_api.route('/cart/<string:key>', methods=['DELETE'])
def delete_cart_item(key):
    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})

    item = cart.get(key)
    cart = utils.delete_item_from_cart(cart, key)

    if current_user.is_authenticated:
        if item:
            product_id = item.get('product_id')
            color = item.get('color')
            size = item.get('size')

            utils.log_activity(
                current_user.MaNguoiDung,
                action='cart_remove',
                message=f'Xóa sản phẩm ID={product_id}, Màu={color}, Size={size} khỏi giỏ hàng'            )
        utils.save_cart(user_id=current_user.MaNguoiDung, cart=cart)
    else:
        session['cart'] = cart

    stats = utils.count_cart(cart)
    mini_cart_html = render_template('partials/mini_cart.html', cart=cart)

    return jsonify({
        'success': True,
        'total_amount': stats['total_amount'],
        'total_quantity': stats['total_quantity'],
        'mini_cart_html': mini_cart_html
    })


@user_api.route('cart/<string:key>', methods=['PATCH'])
def update_cart_item(key):
    data = request.get_json()
    quantity = int(data.get('quantity'))

    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})
    item = cart.get(key)
    cart = utils.update_quantity_item(cart, key=key, quantity=quantity)

    if current_user.is_authenticated:
        if item:
            product_id = item.get('product_id')
            color = item.get('color')
            size = item.get('size')
            quantity = item.get('quantity')


            result , message = utils.check_stock(product_id, size, color, quantity)
            if result:
                utils.log_activity(
                    current_user.MaNguoiDung,
                    action='update_cart',
                    message=f'Cập nhật số lượng = {quantity} cho sản phẩm ID={product_id}, Màu={color}, Size={size} trong giỏ hàng',
                )
                utils.save_cart(user_id=current_user.MaNguoiDung, cart=cart)
            else :
                return jsonify({
                    'success': False,
                    'message': message
                })
    else:
        session['cart'] = cart

    stats = utils.count_cart(cart)

    item_total = 0
    if key in cart:
        try:
            price = Decimal(str(cart[key]['price']))
            quantity = int(cart[key]['quantity'])
            item_total = price * quantity
        except Exception:
            item_total = 0

    item_total = "{:,.0f}".format(item_total)
    mini_cart_html = render_template('partials/mini_cart.html', cart=cart)

    return jsonify({
        'success': True,
        'total_amount': stats['total_amount'],
        'item_total': item_total,
        'total_quantity': stats['total_quantity'],
        'mini_cart_html': mini_cart_html
    })