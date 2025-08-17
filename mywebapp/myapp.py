import math
import uuid
from flask import Blueprint, render_template, request, redirect, flash, session, current_app, jsonify, url_for
from torch.fx.experimental.sym_node import method

import mywebapp.utils as utils
from flask_login import login_user, current_user, logout_user, login_required
from decimal import Decimal
from cloudinary import uploader
from mywebapp.models import  PendingOrder

main = Blueprint('main', __name__)


@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')

        user = utils.check_login(username, password)

        if user:
            login_user(user)
            flash('Đăng nhập thành công!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or '/')
        else:
            flash('Thông tin đăng nhập hoặc mật khẩu không chính xác', 'danger')

    return render_template('login.html')

@main.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        fullname = request.form.get('fullname', '').strip()
        email = request.form.get('email', '').strip()
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        sdt = request.form.get('SDT', '').strip()
        avatar = request.files.get('avatar')

        # Avatar mặc định
        avatar_path = "https://res.cloudinary.com/dmwhvc8tc/image/upload/v1753408922/user_avatar/avatar_default.png"

        if utils.is_username_exist(username):
            flash("Đã tồn tại tài khoản", "danger")
        elif utils.is_email_exist(email):
            flash("Email này đã được đăng ký", "danger")
        elif password != confirm_password:
            flash("Mật khẩu không trùng khớp", "danger")
        else:
            # 1. Tạo user với avatar mặc định
            user = utils.add_user(
                fullname=fullname,
                username=username,
                password=password,
                email=email,
                sdt=sdt,
                avatar=avatar_path
            )

            # 2. Upload avatar nếu có
            if avatar and avatar.filename != '' and avatar.mimetype.startswith('image/'):
                try:
                    res = uploader.upload(
                        avatar,
                        folder="user_avatar",
                        public_id=f"user_{user.MaNguoiDung}_avatar",
                        overwrite=True
                    )
                    user.AnhDaiDien = res['secure_url']
                    utils.db.session.commit()
                except Exception as e:
                    flash("Upload ảnh thất bại", "danger")

            login_user(user)
            return redirect('/')

        return render_template('signin.html',
                               fullname=fullname,
                               email=email,
                               username=username,
                               SDT=sdt)

    return render_template('signin.html')

@main.route('/logout')
def logout():
    logout_user()  # Xoá session hiện tại (đăng xuất)
    flash("Đăng xuất thành công!", "info")
    return redirect('/')  # hoặc chuyển về trang chủ

@main.route('/user/profile')
def profile_details():
    return render_template('profile_details.html')

@main.route('/api/user/profile', methods=['POST'])
@login_required
def api_update_user():
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    avatar = request.files.get('avatar')

    avatar_url = current_user.AnhDaiDien  # giữ nguyên nếu không đổi

    # Nếu có file ảnh mới → upload lên Cloudinary
    if avatar and avatar.filename != '' and avatar.mimetype.startswith('image/'):
        try:
            res = uploader.upload(
                avatar,
                folder="user_avatar",
                public_id=f"user_{current_user.MaNguoiDung}_avatar",
                overwrite=True
            )
            avatar_url = res['secure_url']
        except Exception as e:
            return {'success': False, 'error': 'Upload ảnh thất bại'}, 400

    # Gọi utils.update_user()
    updated_user = utils.update_user(
        user_id=current_user.MaNguoiDung,
        name=name,
        email=email,
        phone=phone,
        avatar=avatar_url
    )
    print(avatar_url)

    if updated_user:
        return {
            'success': True,
            'name': updated_user.HoTen,
            'email': updated_user.Email,
            'phone': updated_user.SoDienThoai,
            'avatar': updated_user.AnhDaiDien
        }
    else:
        return {'success': False, 'error': 'Cập nhật thất bại'}, 500

@main.route('/user/address')
@login_required
def view_address():
    addresses = utils.get_user_addresses_by_id(user_id=current_user.MaNguoiDung)
    return render_template('address.html',addresses = addresses)

@main.route('/api/user/address', methods=['POST'])
def add_address():
    data = request.get_json()
    name=data.get('name')
    address = data.get('address')
    phone = data.get('phone')
    is_default = data.get('is_default')
    user_id = current_user.MaNguoiDung
    new_address = utils.add_address(user_id=user_id,name=name,address=address,phone=phone,is_default=is_default)
    if new_address:
        return {
            'success': True,
            'address_id': new_address.MaDiaChi
        }
    else:
        return {'success': False}

@main.route('/api/address',methods=['PATCH'])
def update_address():
    data = request.get_json()
    address_id = data.get('id')
    name=data.get('ho_ten')
    address=data.get('dia_chi')
    sdt = data.get('sdt')
    is_default=data.get('mac_dinh')

    if utils.update_address(address_id,name,address,sdt,is_default):
        return jsonify({'success': True})
    else :
        return jsonify({'success': False})

@main.route('/api/delete-address', methods=['DELETE'])
def delete_address():
    data = request.get_json()
    address_id = data.get('id')
    if id:
        if utils.delete_address(address_id):
            return jsonify({'success': True})
    else:
        return jsonify({'success': False})


@main.route('/user/dashboard')
def dashboard():
    orders =utils.get_recent_orders(current_user.MaNguoiDung,3)
    return render_template('dashboard.html',orders= orders )


@main.context_processor
def inject_cart_count():
    if current_user.is_authenticated:
        cart = utils.get_cart(current_user.MaNguoiDung)
    else:
        cart = utils.get_cart()
    cart_count = utils.count_cart(cart)
    return dict(cart=cart, cart_count=cart_count)

@main.route('/cart')
def cart():
    if current_user.is_authenticated:
        cart = utils.get_cart(current_user.MaNguoiDung)
    else:
        cart = utils.get_cart()
    cart_count = utils.count_cart(cart)
    return render_template('cart.html', cart=cart, cartCount=cart_count)

@main.route('/api/cart', methods=['POST'])
def create_cart_item():
    data = request.get_json()
    product_id = data.get('id')
    quantity = int(data.get('quantity', 1))
    color = data.get('color')
    size = data.get('size')

    ok, result = utils.check_stock(product_id, size, color, quantity)
    if not ok:
        return jsonify({'error': result}), 400

    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})

    cart = utils.add_item_to_cart(cart, data)

    if current_user.is_authenticated:
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


@main.route('/api/cart/<string:key>', methods=['DELETE'])
def delete_cart_item(key):
    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})

    cart = utils.delete_item_from_cart(cart, key)

    if current_user.is_authenticated:
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


@main.route('/api/cart/<string:key>', methods=['PATCH'])
def update_cart_item(key):
    data = request.get_json()
    quantity = int(data.get('quantity'))

    if current_user.is_authenticated:
        cart = utils.get_cart(user_id=current_user.MaNguoiDung)
    else:
        cart = session.get('cart', {})

    cart = utils.update_quantity_item(cart, key=key, quantity=quantity)

    if current_user.is_authenticated:
        utils.save_cart(user_id=current_user.MaNguoiDung, cart=cart)
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


@main.route('/api/checkout/selection', methods=['POST'])
@login_required
def checkout_selected_items():
    data = request.get_json()
    selected_keys = data.get('checkout_items')

    if not selected_keys:
        return jsonify({'success': False, 'message': 'Vui lòng chọn sản phẩm.'})

    session['checkout_items'] = selected_keys
    return jsonify({
        'success': True,
        'redirect_url': url_for('main.checkout')
    })


@main.route('/api/checkout-items', methods=['POST'])
@login_required
def create_checkout_items():
    data = request.get_json()
    selected_keys = data.get('checkout_items')
    if not selected_keys:
        return jsonify({'success': False, 'message': 'Vui lòng chọn sản phẩm.'})

    session['checkout_items'] = selected_keys
    return jsonify({'success': True})


@main.route('/product_single/<int:product_id>')
def product_single(product_id):
    product = utils.get_product_by_id(product_id)
    related_products = utils.load_products()

    variants_data = utils.get_sizes_and_colors_by_product_id(product_id)
    sizes = variants_data.get('sizes', [])
    colors = variants_data.get('colors', [])

    return render_template(
        'product_single.html',
        product=product,
        related_products=related_products,
        sizes=sizes,
        colors=colors
    )


@main.route('/api/stock', methods=['GET'])
def get_product_stock():
    product_id = request.args.get('product_id')
    color = request.args.get('color')
    size = request.args.get('size')

    quantity = utils.count_stock_product(product_id=product_id, size=size, color=color)
    return jsonify({'quantity': quantity})

@main.route('/checkout', methods=['GET'])
@login_required
def checkout():
    addresses = utils.get_user_addresses_by_id(current_user.MaNguoiDung)

    selected_keys = session.get('checkout_items', None)
    if not selected_keys:
        flash("Không có sản phẩm được chọn", "warning")
        return redirect(url_for('main.cart'))

    selected_items = []
    for key in selected_keys:
        item = utils.get_cart(current_user.MaNguoiDung, key=key)
        if item:
            selected_items.append(item)

    cart_summary = utils.count_cart(selected_items)

    return render_template('checkout.html',
                           cart_items=selected_items,
                           cart_summary=cart_summary,
                           addresses=addresses)


@main.route('/api/checkout-items', methods=['DELETE'])
@login_required
def delete_checkout_items():
    data = request.get_json()
    keys_to_remove = data.get('keys', [])

    if not keys_to_remove:
        return jsonify({'success': False, 'message': 'Không có key để xoá'})

    checkout_items = session.get('checkout_items', [])
    session['checkout_items'] = [k for k in checkout_items if k not in keys_to_remove]
    session.modified = True

    return jsonify({'success': True, 'checkout_items': session['checkout_items']})


@main.route('/')
def home():
    products = utils.load_products()
    categories = utils.get_categories(quantity=3)
    return render_template('index.html', products=products, categories=categories)

@main.route('/shop')
def shop():
    categories = utils.get_categories()
    brands = utils.get_brands()
    cate_id = request.args.get('cate_id')
    brand_id = request.args.get('brand_id')
    kw = request.args.get('kw')
    from_price = request.args.get('from_price')
    to_price = request.args.get('to_price')
    page = int(request.args.get('page', 1))
    products = utils.load_products(cate_id=cate_id, brand_id=brand_id, kw=kw, from_price=from_price, to_price=to_price,
                                   page=page)
    products_count = utils.count_products()
    return render_template('shop.html',
                           brands=brands,
                           categories=categories,
                           products=products,
                           pages=math.ceil(products_count / current_app.config['PAGE_SIZE']))


@main.route('/api/order', methods=['POST'])
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


@main.route('/api/orders/checkout', methods=['POST'])
@login_required
def create_online_checkout():
    data = request.get_json()
    order_info = data.get('order_info')
    order_details = data.get('order_details')

    # 1. Tạo mã đơn tạm
    momo_order_id = str(uuid.uuid4())
    print(momo_order_id)

    # 2. Lưu vào DB
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
    pay_url = utils.generate_momo_payment_url(momo_order_id, total_amount)
    print(pay_url)

    return jsonify({'success': True, 'pay_url': pay_url}) if pay_url else \
           jsonify({'success': False, 'message': 'Không tạo được URL MoMo'}), 500


from datetime import datetime
@main.route('/api/payment/ipn', methods=['POST'])
def momo_ipn():
    data = request.get_json()
    momo_order_id = data.get("orderId")  # UUID string
    result_code = data.get("resultCode")

    if result_code == 0:
        pending = PendingOrder.query.get(momo_order_id)
        if not pending:
            return jsonify({'message': 'Không tìm thấy đơn hàng tạm'}), 400

        order = utils.create_order(
            user_id=pending.MaNguoiDung,
            order_info=pending.ThongTinDonHang,
            order_details=pending.ChiTietDonHang,
            status = 'pending'
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

        # Xóa bản ghi đơn tạm
        utils.db.session.delete(pending)
        utils.db.session.commit()

        return jsonify({'message': 'success'}), 200

    return jsonify({'message': 'fail'}), 400

@main.route('/payment-success',methods=['GET'])
def payment_success():
    print(123)
    result_code = request.args.get('resultCode')
    print(result_code)
    if result_code == '0':
        print(123)
        return render_template('confirmation.html')
    return render_template('confirmation.html')

@main.route('/about')
def about():
    return render_template('about.html')


@main.route('/blog')
def blog():
    return render_template('blog.html')





@main.route('/contact')
def contact():
    return render_template('contact.html')


@main.route('/blog_details')
def blog_details():
    return render_template('blog_details.html')


@main.route('/404')
def error404():
    return render_template('404.html')



@main.route('/empty-cart')
def empty_cart():
    return render_template('empty-cart.html')


@main.route('/faq')
def faq():
    return render_template('faq.html')


@main.route('/forget_password')
def forget_password():
    return render_template('forget_password.html')


@main.route('/pricing')
def pricing():
    return render_template('pricing.html')


@main.route('/purchase-confirmation')
def purchase_confirmation():
    return render_template('purchase-confirmation.html')


@main.route('/shop-sidebar')
def shop_sidebar():
    return render_template('shop-sidebar.html')


@main.route('/typography')
def typography():
    return render_template('typography.html')


@main.route('/alerts')
def alerts():
    return render_template('alerts.html')


@main.route('/blog-full-width')
def blog_full_width():
    return render_template('blog-full-width.html')


@main.route('/blog-grid')
def blog_grid():
    return render_template('blog-grid.html')


@main.route('/blog-left-sidebar')
def blog_left_sidebar():
    return render_template('blog-left-sidebar.html')


@main.route('/blog-right-sidebar')
def blog_right_sidebar():
    return render_template('blog-right-sidebar.html')


@main.route('/blog-single')
def blog_single():
    return render_template('blog-single.html')


@main.route('/buttons')
def buttons():
    return render_template('buttons.html')


@main.route('/coming-soon')
def coming_soon():
    return render_template('coming-soon.html')


# admin