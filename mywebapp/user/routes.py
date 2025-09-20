import math
from datetime import datetime, timedelta

from flask import render_template, request, redirect, flash, session, current_app, jsonify, url_for, g
from flask_mail import Message
from sympy.physics.vector import outer

from mywebapp import utils, mail, oauth
from flask_login import login_user, current_user, logout_user, login_required
from cloudinary import uploader
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
    username=""
    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')
        next_page = request.form.get('next') or next_page
        user,msg = utils.check_login(username, password)

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
            flash(msg, 'danger')

    return render_template('login.html', next=next_page,username=username)



@main.route('/login/google')
def login_google():
    redirect_uri = url_for('main.authorize_google', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@main.route('/auth/google/callback')
def authorize_google():
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.userinfo()

    if not user_info:
        flash('Không lấy được thông tin từ Google', 'danger')
        return redirect(url_for('main.login'))

    email = user_info.get('email')
    name = user_info.get('name')
    avatar = user_info.get('picture')

    user = utils.get_user_by_email(email)
    if not user:
        user = utils.create_user_from_google(email=email, name=name, avatar=avatar)

    # Login user
    login_user(user)
    utils.log_activity(
        user.MaNguoiDung,
        action='login',
        message=f'User {email} đăng nhập bằng Google thành công'
    )

    flash('Đăng nhập bằng Google thành công!', 'success')
    return redirect(url_for('main.home'))



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


@main.route('/test', methods=['GET', 'POST'])
def test():
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
            user = utils.add_user(
                fullname=fullname,
                username=username,
                password=password,
                email=email,
                sdt=sdt,
                avatar=avatar_path
            )

            login_user(user)
            utils.log_activity(user.MaNguoiDung, 'register', f'Đăng ký thành công với username: {username}')
            return redirect('/')

        return render_template('register.html',
                               fullname=fullname,
                               email=email,
                               username=username,
                               SDT=sdt)

    return render_template('test.html')

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
    addresses = utils.get_user_addresses_by_id(user_id=current_user.MaNguoiDung)
    return render_template('address.html', addresses=addresses)

@main.route('/user/vouchers')
@login_required
def view_vouchers():
    coupons = utils.get_user_vouchers(user_id=current_user.MaNguoiDung)
    return render_template('voucher.html', coupons=coupons)


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
    related_products = utils.related_products(product_id=product_id)
    reviews = utils.get_product_reviews(product_id)

    variants_data = utils.get_sizes_and_colors_by_product_id(product_id)
    sizes = variants_data.get('sizes', [])
    colors = variants_data.get('colors', [])

    gallery = utils.get_gallery(product_id)

    return render_template(
        'product_single.html',
        product=product,
        related_products=related_products,
        sizes=sizes,
        colors=colors,
        reviews=reviews,
        gallery=gallery
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
    vouchers = utils.get_user_vouchers(current_user.MaNguoiDung)

    return render_template('checkout.html',
                           cart_items=selected_items,
                           cart_summary=cart_summary,
                           addresses=addresses,
                           vouchers=vouchers)


@main.route('/')
def home():
    products = utils.load_products()
    categories = utils.get_categories(quantity=3)
    flash_sale =utils.get_active_sales()
    return render_template('index.html', products=products, categories=categories, flash_sale=flash_sale)


@main.route('/payment/return')
def momo_return():
    result_code = request.args.get("resultCode")
    order_id = request.args.get("orderId")
    message = request.args.get("message")

    if result_code == "0":
        # Thanh toán thành công
        return render_template('confirmation.html')
    else:
        # Thanh toán thất bại
        return f"Thanh toán thất bại! Đơn hàng {order_id} - {message}"

@main.route('/shop')
def shop():
    # categories = utils.get_categories()
    # brands = utils.get_brands()
    # cate_id = request.args.get('cate_id')
    # brand_id = request.args.get('brand_id')
    # kw = request.args.get('kw')
    # from_price = request.args.get('from_price')
    # to_price = request.args.get('to_price')
    # page = int(request.args.get('page', 1))
    # products = utils.load_products(cate_id=cate_id, brand_id=brand_id, kw=kw, from_price=from_price, to_price=to_price,
    #                                page=page)
    return render_template('shop.html')

@main.route('/confirmation')
def confirmation():
    return render_template('confirmation.html')

@main.route('/forget-password', methods=['GET', 'POST'])
def forget_password():
    if request.method == 'POST':
        email = request.form.get('email')
        print(email)
        if not email:
            flash('Vui lòng nhập email!', 'danger')
            return redirect(url_for('main.forget_password'))

        session['email'] = email
        otp = utils.create_otp(email)

        msg = Message(
            subject="Lấy lại mật khẩu",
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[email],
            body=f"Mã OTP của bạn là: {otp}"
        )
        mail.send(msg)

        flash('OTP đã được gửi vào email của bạn', 'success')
        return redirect(url_for('main.verify_otp'))

    return render_template('forget_password.html')


@main.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    email = session.get('email')
    if not email:
        flash('Vui lòng nhập email trước', 'danger')
        return redirect(url_for('forget_password'))
    if request.method == 'POST':
        otp_input = request.form.get('otp')
        if utils.verify_otp(email, otp_input):
            flash('OTP hợp lệ! Vui lòng đặt mật khẩu mới.', 'success')
            return redirect(url_for('main.reset_password'))
        else:
            flash('OTP không đúng hoặc đã hết hạn', 'danger')
    return render_template('verify_otp.html', email=email)


@main.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    email = session.get('email')
    if not email:
        flash('Vui lòng nhập email trước', 'danger')
        return redirect(url_for('main.forget_password'))
    if request.method == 'POST':
        new_password = request.form.get('password')
        utils.update_password(email, new_password)
        user = utils.get_user_by_email(email)
        utils.delete_otp(email)
        session.pop('email', None)

        utils.log_activity(
            user_id=user.MaNguoiDung,
            action='Reset password',
            message=f"{user.HoTen} đã đổi mật khẩu"
        )

        flash('Đổi mật khẩu thành công!', 'success')
        return redirect(url_for('main.login'))
    return render_template('reset_password.html', email=email)


@main.route('/alerts')
def alerts():
    return render_template('alerts.html')
