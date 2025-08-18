import math
import uuid
from datetime import datetime, timedelta
from flask import render_template, request, redirect, flash, session, current_app, jsonify, url_for, g
from mywebapp import utils
from flask_login import login_user, current_user, logout_user, login_required
from decimal import Decimal
from cloudinary import uploader
from mywebapp.models import PendingOrder
from flask import Blueprint

main = Blueprint('main', __name__, template_folder='../templates/user')


@main.before_request
def update_last_active():
    if current_user.is_authenticated:
        now = datetime.utcnow()
        last_active = current_user.LanCuoiHoatDong  # Tên field tiếng Việt bạn dùng

        if not getattr(g, 'last_active_updated', False) and (
                not last_active or now - last_active > timedelta(minutes=1)
        ):
            utils.update_last_active(current_user)
            g.last_active_updated = True


@main.route('/login', methods=['GET', 'POST'])
def login():
    next_page = request.args.get('next')

    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')
        next_page = request.form.get('next') or next_page
        user = utils.check_login(username, password)

        if user:
            login_user(user)
            cart_session = utils.get_cart()
            cart_db = utils.get_cart(current_user.MaNguoiDung)
            merged_cart = utils.merge_cart_dicts(cart_session, cart_db)
            utils.save_cart(user.MaNguoiDung, merged_cart)
            session.pop('cart', None)
            flash('Đăng nhập thành công!', 'success')
            utils.log_activity(current_user.MaNguoiDung,
                               action='login',
                               message=f'Đăng nhập thành công với tên đăng nhập: {username}')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('main.home')
            return redirect(next_page)
        else:
            flash('Thông tin đăng nhập hoặc mật khẩu không chính xác', 'danger')

    print("DEBUG next_page:", next_page)
    return render_template('login.html', next=next_page)


@main.route('/register', methods=['GET', 'POST'])
def register():
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

        # Kiểm tra thông tin đầu vào
        if utils.is_username_exist(username):
            flash("Đã tồn tại tài khoản", "danger")
        elif utils.is_email_exist(email):
            flash("Email này đã được đăng ký", "danger")
        elif password != confirm_password:
            flash("Mật khẩu không trùng khớp", "danger")
        else:
            # 1. Tạo người dùng mới
            user = utils.add_user(
                fullname=fullname,
                username=username,
                password=password,
                email=email,
                sdt=sdt,
                avatar=avatar_path
            )

            # 2. Nếu có avatar upload thì lưu
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
            utils.log_activity(user.MaNguoiDung, 'register', f'Đăng ký thành công với username: {username}')
            return redirect('/')

        return render_template('register.html',
                               fullname=fullname,
                               email=email,
                               username=username,
                               SDT=sdt)

    return render_template('register.html')


@main.route('/logout')
@login_required
def logout():
    utils.log_activity(current_user.MaNguoiDung,
                       action='logout',
                       message=f'Đăng xuất thành công')
    logout_user()  # Xoá session hiện tại (đăng xuất)
    flash("Đăng xuất thành công!", "info")
    return redirect('/')  # hoặc chuyển về trang chủ


@main.route('/user/profile')
def profile_details():
    return render_template('profile_details.html')


@main.route('/user/api/change-password', methods=['GET', 'POST'])
def change_password():
    if request.method == 'POST':
        old_password = request.form.get('old_password', '').strip()
        new_password = request.form.get('new_password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        if new_password != confirm_password:
            return {"success": False, "error": "Mật khẩu xác nhận không khớp"}, 400

        result = utils.change_password(
            user_id=current_user.MaNguoiDung,
            old_pass=old_password,
            new_pass=new_password
        )

        if result is True:
            utils.log_activity(
                current_user.MaNguoiDung,
                action='change_password',
                message=f"User {current_user.MaNguoiDung} đổi mật khẩu"
            )
            return {"success": True, "message": "Đổi mật khẩu thành công"}, 200

        if result == "wrong_old_password":
            return {"success": False, "error": "Mật khẩu cũ không đúng"}, 401

        return {"success": False, "error": "Có lỗi xảy ra, vui lòng thử lại"}, 500

@main.route('/user/change-password')
def change_password_view():
    return render_template('change_password.html')


@main.route('/api/user/profile', methods=['POST'])
@login_required
def api_update_user():
    # Lưu giá trị cũ
    old_name = current_user.HoTen
    old_email = current_user.Email
    old_phone = current_user.SoDienThoai
    old_avatar = current_user.AnhDaiDien

    # Lấy giá trị mới
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    avatar = request.files.get('avatar')

    avatar_url = old_avatar  # mặc định giữ nguyên

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
        except Exception:
            return {'success': False, 'error': 'Upload ảnh thất bại'}, 400

    # Cập nhật user
    updated_user = utils.update_user(
        user_id=current_user.MaNguoiDung,
        name=name,
        email=email,
        phone=phone,
        avatar=avatar_url
    )

    # So sánh để tạo log chi tiết
    changes = []
    if old_name != name:
        changes.append(f"Họ tên: '{old_name}' → '{name}'")
    if old_email != email:
        changes.append(f"Email: '{old_email}' → '{email}'")
    if old_phone != phone:
        changes.append(f"SĐT: '{old_phone}' → '{phone}'")
    if old_avatar != avatar_url:
        changes.append(f"Ảnh đại diện: đổi mới")

    change_message = "; ".join(changes) if changes else "Không có thay đổi"

    # Ghi log
    utils.log_activity(
        user_id=current_user.MaNguoiDung,
        action='update_profile',
        message=f"User {current_user.MaNguoiDung} cập nhật: {change_message}")

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
    print("🔎 Debug request.path:", request.path)
    addresses = utils.get_user_addresses_by_id(user_id=current_user.MaNguoiDung)
    return render_template('address.html', addresses=addresses)


@main.route('/user/dashboard')
def dashboard():
    orders = utils.get_recent_orders(current_user.MaNguoiDung, 3)
    return render_template('dashboard.html', orders=orders)


@main.route('/user/order')
@login_required
def order():
    return render_template('order.html')


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


@main.route('/product_single/<int:product_id>')
def product_single(product_id):
    product = utils.get_product_by_id(product_id)
    related_products = utils.load_products(cate_id=product.MaDanhMuc, brand_id=product.MaThuongHieu)
    reviews = utils.get_product_reviews(product_id)

    variants_data = utils.get_sizes_and_colors_by_product_id(product_id)
    sizes = variants_data.get('sizes', [])
    colors = variants_data.get('colors', [])

    return render_template(
        'product_single.html',
        product=product,
        related_products=related_products,
        sizes=sizes,
        colors=colors,
        reviews=reviews
    )


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


@main.route('/')
def home():
    products = utils.load_products()
    categories = utils.get_categories(quantity=3)
    return render_template('index.html', products=products, categories=categories)


@main.route('/api/orders/checkout', methods=['POST'])
@login_required
def create_online_checkout():
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
        message=f'Khởi tạo thanh toán MoMo đơn #{momo_order_id}, tổng tiền {total_amount}')
    pay_url = utils.generate_momo_payment_url(momo_order_id, total_amount)
    print(pay_url)

    return jsonify({'success': True, 'pay_url': pay_url}) if pay_url else \
        jsonify({'success': False, 'message': 'Không tạo được URL MoMo'}), 500


@main.route('/api/payment/ipn', methods=['POST'])
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
            message=f'Thanh toán MoMo thành công đơn #{order.MaDonHang}'
        )
        # Xóa bản ghi đơn tạm
        utils.db.session.delete(pending)
        utils.db.session.commit()

        return jsonify({'message': 'success'}), 200

    return jsonify({'message': 'fail'}), 400


@main.route('/payment-success', methods=['GET'])
def payment_success():
    result_code = request.args.get('resultCode')
    if result_code == '0':
        return redirect(url_for('main.confirmation'))
    return jsonify({'message': 'fail'}), 400


@main.route('/confirmation')
def confirmation():
    return render_template('confirmation.html')


@main.route('/about')
def about():
    return render_template('about.html')


@main.route('/blog')
def blog():
    return render_template('blog.html')


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


@main.route('/contact')
def contact():
    return render_template('contact.html')


@main.route('/blog_details')
def blog_details():
    return render_template('blog_details.html')


@main.route('/forget_password')
def forget_password():
    return render_template('forget_password.html')


@main.route('/alerts')
def alerts():
    return render_template('alerts.html')
