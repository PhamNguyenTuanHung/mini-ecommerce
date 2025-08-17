from datetime import datetime
import requests
from sqlalchemy import func, false, desc
from flask import current_app, session, request
from werkzeug.security import check_password_hash, generate_password_hash
from mywebapp import db
from mywebapp.admin.routes import categories
from mywebapp.models import Product, Category, Brand, CartItem, Cart, User, ProductVariant, Order, OrderDetail, Payment, \
    ShippingInfo, UserAddress, ProductImage, ActivityLog, OrderLog, Review, Admin
from decimal import Decimal
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from humanize import naturaltime
import hmac, hashlib, uuid


def get_categories(product_id=None, quantity=None):
    q = db.session.query(
        Category.MaDanhMuc,
        Category.TenDanhMuc,
        func.count(Product.MaSanPham).label('product_count')
    ).outerjoin(Product, Product.MaDanhMuc == Category.MaDanhMuc)

    if product_id:
        prod = db.session.query(Product).get(product_id)
        if prod:
            q = q.filter(Category.MaDanhMuc == prod.MaDanhMuc)

    q = q.group_by(Category.MaDanhMuc, Category.TenDanhMuc)

    if quantity:
        q = q.limit(quantity)

    return [
        {'id': id, 'name': name, 'product_count': count}
        for id, name, count in q.all()
    ]


def add_category(name):
    category = Category(TenDanhMuc=name)
    db.session.add(category)
    db.session.commit()
    return True


def get_categories_summary():
    rows = (
        db.session.query(
            Category.MaDanhMuc,
            Category.TenDanhMuc,
            func.coalesce(func.sum(OrderDetail.DonGia * OrderDetail.SoLuong), 0).label('revenue')
        )
        .outerjoin(Product, Product.MaDanhMuc == Category.MaDanhMuc)
        .outerjoin(OrderDetail, OrderDetail.MaSanPham == Product.MaSanPham)
        .group_by(Category.MaDanhMuc, Category.TenDanhMuc)
        .all()
    )

    return [
        {'id': cat_id, 'name': name, 'revenue': revenue or 0}
        for cat_id, name, revenue in rows
    ]


def get_revenue_category(category_id):
    sale_products = (
        Category.query
        .options(
            joinedload(Category.products)
            .joinedload(Product.order_details)
        )
        .filter(Category.MaDanhMuc == category_id)
        .first()
    )
    result = 0
    for product in sale_products.products:
        for od in product.order_details:
            result += od.DonGia * od.SoLuong

    return result


def update_category(category_id, new_name):
    category = db.session.query(Category).get(category_id)
    if not category:
        return None
    category.TenDanhMuc = new_name
    db.session.commit()
    return True


def delete_category(category_id):
    category = db.session.query(Category).get(category_id)
    if not category:
        return False
    db.session.delete(category)
    db.session.commit()
    return True


def get_brands():
    return Brand.query.all()


def load_products(cate_id=None, brand_id=None, kw=None, from_price=None, to_price=None, page=1):
    query = db.session.query(Product)

    if cate_id:
        query = query.filter(Product.MaDanhMuc == cate_id)

    if brand_id:
        query = query.filter(Product.MaThuongHieu == brand_id)

    if kw:
        query = query.filter(Product.TenSanPham.ilike(f"%{kw}%"))

    if from_price is not None:
        query = query.filter(Product.Gia >= from_price)

    if to_price is not None:
        query = query.filter(Product.Gia <= to_price)

    page_size = current_app.config.get('PAGE_SIZE', 10)
    start = (page - 1) * page_size
    end = start + page_size

    query = query.order_by(Product.TenSanPham)

    return query.slice(start, end).all()


from sqlalchemy import func


def get_products():
    products = db.session.query(Product).all()
    sales_data = dict(db.session.query(
        OrderDetail.MaSanPham,
        func.sum(OrderDetail.SoLuong)
    ).group_by(OrderDetail.MaSanPham).all())

    result = []
    for product in products:
        quantity_sold = sales_data.get(product.MaSanPham, 0)
        result.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'price': product.Gia,
            'image': product.HinhAnh,
            'description': product.MoTa,
            'brand': {
                'id': product.brand.MaThuongHieu,
                'name': product.brand.TenThuongHieu
            },
            'category': {
                'id': product.category.MaDanhMuc,
                'name': product.category.TenDanhMuc
            },
            'rating': product.DiemDanhGia,
            'quantity_sold': quantity_sold
        })
    return result


def get_order_products_with_user_reviews(order_id, user_id):
    # Lấy đơn hàng của user hiện tại
    order = (
        Order.query
        .options(joinedload(Order.order_details).joinedload(OrderDetail.product))
        .filter(Order.MaDonHang == order_id)
        .first()
    )

    # Tạo danh sách sản phẩm + review của user
    products_with_review = []

    for detail in order.order_details:
        product = detail.product

        # Lấy review của user cho sản phẩm này
        review = Review.query.filter_by(
            MaSanPham=product.MaSanPham,
            MaNguoiDung=user_id
        ).first()
        reviewed = False

        if review:
            reviewed = True

        products_with_review.append({
            "id": product.MaSanPham,
            "name": product.TenSanPham,
            "size": detail.KichThuoc,
            "color": detail.MauSac,
            "image_url": product.HinhAnh,
            "rating": review.DiemDanhGia if review else 0,
            "comment": review.BinhLuan if review else "",
            "reviewed": reviewed
        })

    return products_with_review


def get_all_products_with_stock():
    products = (
        Product.query
        .options(
            joinedload(Product.brand),
            joinedload(Product.category),
            joinedload(Product.product_variants)
        )
        .all()
    )
    result = []

    for product in products:
        total_stock = sum(variant.SoLuongTon for variant in product.product_variants)
        variants = [
            {
                'color': variant.MauSac,
                'size': variant.KichThuoc,
                'stock': variant.SoLuongTon
            }
            for variant in product.product_variants
        ]

        result.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'stock': total_stock,
            'price': product.Gia,
            'image': product.HinhAnh,
            'description': product.MoTa,
            'brand': {
                'id': product.brand.MaThuongHieu,
                'name': product.brand.TenThuongHieu
            },
            'category': {
                'id': product.category.MaDanhMuc,
                'name': product.category.TenDanhMuc
            },
            'variants': variants
        })

    return result

def get_all_sales():
    rows = db.session.query(
        Order.NgayDat,
        OrderDetail.MaSanPham,
        OrderDetail.SoLuong
    ).join(OrderDetail, Order.MaDonHang == OrderDetail.MaDonHang) \
     .filter(Order.TrangThai == 'delivered') \
     .all()

    result = [
        {
            'date': row.NgayDat.strftime('%Y-%m-%d'),
            'product_id': row.MaSanPham,
            'quantity': row.SoLuong
        }
        for row in rows
    ]
    return result

def delete_product_by_id(product_id):
    product = Product.query.get(product_id)
    variants = product.product_variants

    if not product:
        return False

    try:
        for variant in variants:
            db.session.delete(variant)
            db.session.commit()
        db.session.delete(product)
        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        return False


def add_product(name, price, description, category_id, brand_id, img, variants):
    try:
        if not variants or not isinstance(variants, list) or len(variants) == 0:
            return {"success": False, "error": "Phải có ít nhất một biến thể sản phẩm"}

        new_product = Product(
            TenSanPham=name,
            Gia=price,
            MoTa=description,
            MaDanhMuc=category_id,
            MaThuongHieu=brand_id,
            HinhAnh=img if img else None
        )
        db.session.add(new_product)
        db.session.flush()

        for v in variants:
            kich_thuoc = v.get('size') or v.get('KichThuoc')
            mau_sac = v.get('color') or v.get('MauSac')
            so_luong = v.get('stock') or v.get('SoLuongTon', 0)

            if not kich_thuoc or not mau_sac:
                return {"success": False, "error": "Biến thể phải có cả Màu sắc và Kích thước"}

            variant = ProductVariant(
                MaSanPham=new_product.MaSanPham,
                KichThuoc=kich_thuoc,
                MauSac=mau_sac,
                SoLuongTon=so_luong
            )
            db.session.add(variant)

        db.session.commit()
        return True

    except Exception as e:
        db.session.rollback()
        return False


def update_product(product_id, name, price, description, category_id, brand_id, img=None, variants=[]):
    try:
        product = Product.query.get(product_id)
        if not product:
            return {"success": False, "error": "Không tìm thấy sản phẩm"}

        product.TenSanPham = name
        product.Gia = price
        product.MoTa = description
        product.MaDanhMuc = category_id
        product.MaThuongHieu = brand_id

        if img:  # Chỉ cập nhật ảnh nếu có
            product.HinhAnh = img

        # Xử lý biến thể
        existing_variants = {(v.MaSanPham, v.KichThuoc, v.MauSac): v
                             for v in ProductVariant.query.filter_by(MaSanPham=product_id).all()}
        updated_keys = set()

        for v in variants:
            size = v.get('size') or v.get('KichThuoc')
            color = v.get('color') or v.get('MauSac')
            stock = v.get('stock') or v.get('SoLuongTon', 0)
            key = (product_id, size, color)
            updated_keys.add(key)

            if key in existing_variants:
                existing_variants[key].SoLuongTon = stock
            else:
                new_variant = ProductVariant(
                    MaSanPham=product_id,
                    KichThuoc=size,
                    MauSac=color,
                    SoLuongTon=stock
                )
                db.session.add(new_variant)

        # Xóa các biến thể không còn tồn tại trong dữ liệu mới
        for key, variant in existing_variants.items():
            if key not in updated_keys:
                db.session.delete(variant)

        db.session.commit()
        return True

    except Exception as e:
        db.session.rollback()
        return False


def count_products():
    return db.session.query(Product).count()


def get_users():
    users = User.query.all()
    days_vi = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    result = []
    for user in users:
        result.append({
            'id': user.MaNguoiDung,
            # 'username':user.TenDangNhap,
            # 'password':user.MatKhau,
            'name': user.HoTen,
            'email': user.Email,
            'role': 'user',
            'status': 'active' if user.KichHoat else 'inactive',
            'lastActive': user.LanCuoiHoatDong,
            'joinDate': user.NgayTao,
            'thu': days_vi[user.NgayTao.weekday()],
            'avatar': user.AnhDaiDien,
            'phone': user.SoDienThoai,
            'totalOrders': len(user.orders)
        })
    return result


def get_user_detail_by_id(user_id):
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return None

    # Tổng số đơn hàng
    total_orders = Order.query.filter_by(MaNguoiDung=user_id).count()

    # Tổng tiền đã chi tiêu (chỉ tính đơn đã thanh toán)
    total_spent = db.session.query(func.sum(Order.TongTien)) \
                      .filter(Order.MaNguoiDung == user_id, Order.TrangThai == 'Đã giao') \
                      .scalar() or 0

    # Thống kê theo trạng thái đơn hàng
    order_status_counts = db.session.query(Order.TrangThai, func.count(Order.MaDonHang)) \
        .filter(Order.MaNguoiDung == user_id) \
        .group_by(Order.TrangThai).all()

    status_summary = {status: count for status, count in order_status_counts}

    return {
        'id': user.id,
        'name': user.HoTen,
        'email': user.Email,
        'phone': user.SoDienThoai,
        'dob': user.NgaySinh.strftime('%Y-%m-%d') if user.NgaySinh else None,
        'address': user.DiaChi,
        'avatar': user.AnhDaiDien,
        'active': bool(user.KichHoat),
        'created_at': user.created_at.strftime('%Y-%m-%d') if hasattr(user, 'created_at') else None,
        'total_orders': total_orders,
        'total_spent': total_spent,
        'orders_by_status': status_summary
    }


def add_user(fullname, username, password, email, sdt, avatar):
    password = generate_password_hash(password.strip())
    user = User(
        HoTen=fullname,
        TenDangNhap=username,
        MatKhau=password,
        Email=email,
        SoDienThoai=sdt,
        AnhDaiDien=avatar
    )
    db.session.add(user)
    db.session.commit()
    return user


def update_user(user_id, name=None, email=None, phone=None, avatar=None, status=None):
    user = User.query.get(user_id)
    if not user:
        return None

    if name is not None:
        user.HoTen = name
    if email is not None:
        user.Email = email
    if phone is not None:
        user.SoDienThoai = phone
    if avatar is not None:
        user.AnhDaiDien = avatar
    if status is not None:
        user.KichHoat = status

    try:
        db.session.commit()
        return user
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user: {e}")
        return None


def update_last_active(user):
    user.LanCuoiHoatDong = datetime.utcnow()
    db.session.commit()


def set_default_address_for_user(user_id):
    db.session.query(UserAddress) \
        .filter_by(MaNguoiDung=user_id, MacDinh=True) \
        .update({'MacDinh': False})
    db.session.commit()


def get_user_addresses_by_id(user_id):
    return UserAddress.query.filter_by(MaNguoiDung=user_id).all()


def update_address(address_id, name, address_detail, phone, is_default):
    address = UserAddress.query.get(address_id)
    if not address:
        return False
    user_id = address.MaNguoiDung
    address.TenNguoiNhan = name
    address.DiaChiChiTiet = address_detail
    address.SoDienThoai = phone

    if is_default:
        set_default_address_for_user(user_id=user_id)
    address.MacDinh = is_default
    db.session.commit()
    return True


def delete_address(address_id):
    address = UserAddress.query.get(address_id)
    if address:
        db.session.delete(address)
        db.session.commit()
        return True
    return False


def add_address(user_id, name, address, phone, is_default=False):
    if is_default:
        # Gỡ mặc định các địa chỉ khác của user
        set_default_address_for_user(user_id=user_id)

    new_address = UserAddress(
        MaNguoiDung=user_id,
        TenNguoiNhan=name,
        DiaChiChiTiet=address,
        SoDienThoai=phone,
        MacDinh=is_default
    )

    db.session.add(new_address)
    db.session.commit()
    return new_address


def check_login(username, password):
    user = User.query.filter(
        or_(
            User.TenDangNhap == username,
            User.Email == username
        )
    ).first()
    if user and check_password_hash(user.MatKhau, password):
        return user  # Đăng nhập thành công, trả về đối tượng user
    return None  # Đăng nhập thất bại


def is_username_exist(username):
    user = User.query.filter(User.TenDangNhap == username).first()
    return user is not None


def is_email_exist(email):
    email = User.query.filter(User.Email == email).first()
    return email is not None


def get_user_by_id(user_id):
    return User.query.get(user_id)


def get_status_user_by_id(user_id):
    user = get_user_detail_by_id(user_id)


def get_cart(user_id=None, key=None):
    cart_dict = {}

    if user_id:
        cart_items = db.session.query(CartItem) \
            .join(Cart, CartItem.MaGioHang == Cart.MaGioHang) \
            .filter(Cart.MaNguoiDung == user_id) \
            .all()

        for item in cart_items:
            product = item.product
            product_id = product.MaSanPham
            size = item.KichThuoc
            color = item.MauSac
            quantity = item.SoLuong
            item_key = f"{product_id}_{size}_{color}"

            cart_dict[item_key] = {
                'key': item_key,
                'product_id': product_id,
                'name': product.TenSanPham,
                'image': product.HinhAnh,
                'price': float(product.Gia),
                'quantity': quantity,
                'size': size,
                'color': color
            }
    else:
        cart_dict = session.get('cart', {})

    if key:
        return cart_dict.get(key)

    return cart_dict


def merge_cart_dicts(cart_session, cart_user_db):
    merged_cart = cart_user_db.copy()

    for key, item in cart_session.items():
        if key in merged_cart:
            merged_cart[key]['quantity'] += item['quantity']
        else:
            merged_cart[key] = item

    return merged_cart


def count_cart(cart):
    total_quantity = 0
    total_amount = Decimal(0)

    # Nếu là dict → lấy values
    if isinstance(cart, dict):
        items = cart.values()
    else:
        items = cart  # Giả sử là list

    for item in items:
        quantity = int(item.get('quantity', 0))
        price_raw = item.get('price', 0)

        try:
            price = Decimal(str(price_raw))
        except:
            price = Decimal(0)

        total_quantity += quantity
        total_amount += Decimal(quantity) * price

    return {
        'total_quantity': total_quantity,
        'total_amount': total_amount
    }


def check_stock(product_id, size, color, quantity):
    variant = db.session.query(ProductVariant).filter_by(
        MaSanPham=product_id,
        KichThuoc=size,
        MauSac=color
    ).first()

    if not variant:
        return False, 'Phân loại sản phẩm không tồn tại!'

    if quantity > variant.SoLuongTon:
        return False, f'Chỉ còn {variant.SoLuongTon} sản phẩm trong kho!'

    return True, variant.SoLuongTon


def add_item_to_cart(cart, item):
    product_id = str(item['id'])
    size = item.get('size')
    color = item.get('color')
    image = item.get('image')
    key = f'{product_id}_{size}_{color}'
    quantity = item.get('quantity', 1)

    if key in cart:
        cart[key]['quantity'] += quantity
    else:
        cart[key] = {
            'product_id': product_id,
            'name': item['name'],
            'price': float(item['price']),
            'quantity': quantity,
            'size': size,
            'color': color,
            'image': image
        }
    return cart


def delete_item_from_cart(cart, key):
    if key in cart:
        del cart[key]
    return cart


def update_quantity_item(cart, key, quantity):
    if key in cart:
        if quantity <= 0:
            delete_item_from_cart(cart, key)
        else:
            cart[key]['quantity'] = quantity
    return cart


def save_cart(user_id: int, cart: dict):
    cart_obj = db.session.query(Cart).filter_by(MaNguoiDung=user_id).first()
    if not cart_obj:
        cart_obj = Cart(MaNguoiDung=user_id)
        db.session.add(cart_obj)
        db.session.commit()

    # Các item hiện có trong DB, key = (product_id, size, color)
    existing_items = {
        f"{item.MaSanPham}_{item.KichThuoc}_{item.MauSac}": item
        for item in cart_obj.cart_items
    }

    for key, item in cart.items():
        try:
            product_id, size, color = key.split('_')
            product_id = int(product_id)
        except ValueError:
            continue  # Bỏ qua key sai định dạng

        quantity = int(item.get('quantity', 0))

        if key in existing_items:
            if quantity <= 0:
                db.session.delete(existing_items[key])
            else:
                existing_items[key].SoLuong = quantity
        else:
            if quantity > 0:
                new_item = CartItem(
                    MaGioHang=cart_obj.MaGioHang,
                    MaSanPham=product_id,
                    SoLuong=quantity,
                    KichThuoc=size,
                    MauSac=color
                )
                db.session.add(new_item)

        # Xoá các sản phẩm không còn trong cart
    current_keys = set(cart.keys())
    for key in list(existing_items.keys()):
        if key not in current_keys:
            db.session.delete(existing_items[key])

    db.session.commit()


def get_product_by_id(id):
    return Product.query.filter_by(MaSanPham=id).first()


def get_sizes_and_colors_by_product_id(product_id):
    variants = ProductVariant.query.filter_by(MaSanPham=product_id).all()

    sizes = sorted(set(v.KichThuoc for v in variants))
    colors = sorted(set(v.MauSac for v in variants))

    return {
        'sizes': sizes,
        'colors': colors
    }


def count_stock_product(product_id, size=None, color=None):
    query = ProductVariant.query.filter_by(MaSanPham=product_id)
    if size:
        query = query.filter(ProductVariant.KichThuoc == size.strip())
    if color:
        query = query.filter(ProductVariant.MauSac == color.strip())

    variant = query.first()
    return variant.SoLuongTon if variant else 0


def get_orders_by_user_id(user_id):
    orders = Order.query.options(
        joinedload(Order.user),
        joinedload(Order.user_address),
        joinedload(Order.order_details).joinedload(OrderDetail.product),
        joinedload(Order.shipping_infos),
        joinedload(Order.payment)
    ).filter_by(MaNguoiDung=user_id).order_by(Order.NgayDat.desc()).all()

    result = []

    for order in orders:
        result.append({
            "id": order.MaDonHang,
            "orderDate": order.NgayDat.strftime('%Y-%m-%d %H:%M:%S') if order.NgayDat else None,
            "status": order.TrangThai,
            "total": float(order.TongTien) if order.TongTien else 0,
            "items": [
                {
                    "name": detail.product.TenSanPham if detail.product else None,
                    "quantity": detail.SoLuong,
                    "price": float(detail.DonGia) if detail.DonGia else 0,
                    "color": detail.MauSac,
                    "size": detail.KichThuoc
                }
                for detail in order.order_details
            ],
            "itemCount": sum(detail.SoLuong for detail in order.order_details),
            "customer": {
                "id": order.MaNguoiDung,
                "avatar": order.user.AnhDaiDien if order.user else None,
                "name": order.user.HoTen if order.user else None,
                "email": order.user.Email if order.user else None,
                "phone": order.user.SoDienThoai if order.user else None
            },
            "shippingAddress": order.user_address.DiaChiChiTiet if order.user_address else None,
            "payment": order.payment.TrangThaiThanhToan if order.payment else None,
            "shippingFee": 0
        })

    return result


def get_recent_orders(user_id, limit=5):
    orders = (
        db.session.query(Order)
        .filter_by(MaNguoiDung=user_id)
        .order_by(Order.NgayDat.desc())
        .limit(limit)
        .all()
    )

    result = []
    for order in orders:
        total = sum(od.SoLuong * od.DonGia for od in order.order_details)
        result.append({
            "id": order.MaDonHang,
            "date": order.NgayDat,
            "status": order.TrangThai,
            "total": total + (order.PhiVanChuyen or 0) - (order.GiamGia or 0)
        })

    return result


def remove_ordered_items_from_cart(cart, ordered_items):
    for item in ordered_items:
        key = f"{item['product_id']}_{item.get('size')}_{item.get('color')}"
        if key in cart:
            del cart[key]
    return cart


def update_stock(key, quantity):
    try:
        product_id, size, color = key.split('_')

        variation = ProductVariant.query.filter_by(
            MaSanPham=product_id,
            KichThuoc=size,
            MauSac=color
        ).first()
        if variation:
            if variation.SoLuongTon >= quantity:
                variation.SoLuongTon -= quantity
            else:
                raise ValueError("Số lượng trong kho không đủ")

            db.session.commit()
        else:
            raise ValueError("Không tìm thấy biến thể sản phẩm")

    except Exception as ex:
        print("❌ Lỗi cập nhật kho:", ex)


def get_order_by_id(order_id):
    return Order.query.filter_by(MaDonHang=order_id).first()


def get_order_detail_by_id(order_id):
    order = Order.query.options(
        joinedload(Order.user),
        joinedload(Order.user_address),
        joinedload(Order.order_details).joinedload(OrderDetail.product),
        joinedload(Order.shipping_infos),
        joinedload(Order.payment)).filter_by(MaDonHang=order_id).first()

    if not order:
        return {"message": "Đơn hàng không tồn tại"}, 404

    result = {
        "id": order.MaDonHang,
        "orderDate": order.NgayDat.strftime('%Y-%m-%d %H:%M:%S') if order.NgayDat else None,
        "status": order.TrangThai,
        "total": float(order.TongTien),
        "items": [
            {
                "name": detail.product.TenSanPham if detail.product else None,
                "quantity": detail.SoLuong,
                "price": float(detail.DonGia),
                "color": detail.MauSac,
                "size": detail.KichThuoc
            }
            for detail in order.order_details
        ],
        "itemCount": sum(detail.SoLuong for detail in order.order_details),
        "customer": {
            "id": order.MaNguoiDung,
            "avatar": order.user.AnhDaiDien,
            "name": order.user.HoTen if order.user else None,
            "email": order.user.Email if order.user else None,
            'phone': order.user.SoDienThoai if order.user else None
        },
        "shippingAddress": order.user_address.DiaChiChiTiet if order.user_address else None,
        "payment": order.payment.TrangThaiThanhToan if order.payment else None
    }
    return result


def get_order_detail():
    orders = (
        Order.query
        .options(
            joinedload(Order.user),
            joinedload(Order.user_address),
            joinedload(Order.order_details).joinedload(OrderDetail.product),
            joinedload(Order.shipping_infos),
            joinedload(Order.payment)
        )
        .order_by(desc(Order.MaDonHang))
        .all()
    )

    if not orders:
        return {"message": "Đơn hàng không tồn tại"}, 404

    result = []
    for order in orders:
        result.append({
            "id": order.MaDonHang,
            "orderDate": order.NgayDat.strftime('%Y-%m-%d %H:%M:%S') if order.NgayDat else None,
            "status": order.TrangThai,
            "total": float(order.TongTien),
            "items": [
                {
                    "name": detail.product.TenSanPham if detail.product else None,
                    "quantity": detail.SoLuong,
                    "price": float(detail.DonGia),
                    "color": detail.MauSac,
                    "size": detail.KichThuoc
                }
                for detail in order.order_details
            ],
            "itemCount": sum(detail.SoLuong for detail in order.order_details),
            "customer": {
                "id": order.MaNguoiDung,
                "avatar": order.user.AnhDaiDien,
                "name": order.user.HoTen if order.user else None,
                "email": order.user.Email if order.user else None,
                'phone': order.user.SoDienThoai if order.user else None
            },
            "shippingAddress": order.user_address.DiaChiChiTiet if order.user_address else None,
            "payment": order.payment.TrangThaiThanhToan if order.payment else None
        })
    return result


def create_order(user_id, order_info, order_details, status=None):
    new_order = Order(
        MaNguoiDung=user_id,
        TongTien=order_info['total_amount'],
        PhiVanChuyen=order_info.get('shipping_fee', 0),
        GiamGia=order_info.get('discount', 0),
        TrangThai='pending' if status is None else status,
        MaDiaChi=order_info['address_id']
    )
    db.session.add(new_order)
    db.session.flush()

    for item in order_details:
        detail = OrderDetail(
            MaDonHang=new_order.MaDonHang,
            MaSanPham=item['product_id'],
            SoLuong=item['quantity'],
            DonGia=item['price'],
            MauSac=item['color'],
            KichThuoc=item['size']
        )
        db.session.add(detail)
    db.session.commit()
    return new_order


def cancel_order(order_id):
    order = Order.query.filter_by(MaDonHang=order_id).first()
    order_details = OrderDetail.query.filter_by(MaDonHang=order_id).all()
    for order_detail in order_details:
        product_id = order_detail.MaSanPham
        size = order_detail.KichThuoc
        color = order_detail.MauSac
        key = f'{product_id}_{size}_{color}'
        quantity = order_detail.SoLuong
        update_stock(key, -quantity)

    if order.TrangThai in ['processing', 'pending']:
        order.TrangThai = 'cancelled'
        db.session.commit()
    return True


def update_order(order_id, status):
    order = Order.query.filter_by(MaDonHang=order_id).first()
    if not order:
        return {"success": False, "message": "Đơn hàng không tồn tại"}, 404

    order.TrangThai = status
    db.session.commit()
    return {"success": True}


def create_payment(order_id, payment_method, payment_status, payment_date=None):
    payment = Payment(
        MaDonHang=order_id,
        PhuongThuc=payment_method,
        TrangThaiThanhToan=payment_status,
        NgayThanhToan=payment_date if payment_status == "Đã thanh toán" else None
    )
    db.session.add(payment)
    db.session.commit()


def generate_momo_payment_url(order_id, amount):
    partner_code = "MOMO"
    access_key = "F8BBA842ECF85"
    secret_key = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    endpoint = "https://test-payment.momo.vn/v2/gateway/api/create"

    request_id = str(uuid.uuid4())
    order_info = "Thanh toán đơn hàng MoMo"
    redirect_url = "http://localhost:5000/payment/return"
    ipn_url = "http://localhost:5000/api/payment/ipn"
    request_type = "captureWallet"
    extra_data = ""  # Có thể để thông tin thêm nếu cần

    # Chuỗi raw để ký HMAC SHA256
    raw_signature = (
        f"accessKey={access_key}&amount={amount}&extraData={extra_data}"
        f"&ipnUrl={ipn_url}&orderId={order_id}&orderInfo={order_info}"
        f"&partnerCode={partner_code}&redirectUrl={redirect_url}"
        f"&requestId={request_id}&requestType={request_type}"
    )

    # Ký HMAC
    signature = hmac.new(secret_key.encode('utf-8'),
                         raw_signature.encode('utf-8'),
                         hashlib.sha256).hexdigest()

    # Dữ liệu gửi API MoMo
    data = {
        "partnerCode": partner_code,
        "partnerName": "Test",
        "storeId": "MomoTestStore",
        "requestId": request_id,
        "amount": str(amount),
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": redirect_url,
        "ipnUrl": ipn_url,
        "lang": "vi",
        "extraData": extra_data,
        "requestType": request_type,
        "signature": signature
    }

    # Gọi API MoMo
    response = requests.post(endpoint, json=data, headers={'Content-Type': 'application/json'})
    result = response.json()
    if result.get("resultCode") == 0:
        return result.get("payUrl")
    else:
        raise Exception(f"Lỗi tạo link MoMo: {result}")


def log_activity(user_id: int, action: str, message: str = ''):
    log = ActivityLog(
        MaNguoiDung=user_id,
        HanhDong=action,
        MoTa=(f" | {message}" if message else ''),
        ThoiGian=datetime.now()
    )
    db.session.add(log)
    db.session.commit()


def extract_action_type(action: str):
    action = (action or '').lower()
    if any(key in action for key in ['add', 'create', 'register', 'prepare']):
        return 'create'
    elif 'update' in action:
        return 'update'
    elif any(key in action for key in ['remove', 'delete', 'cancel']):
        return 'delete'
    elif 'login' in action:
        return 'login'
    elif 'logout' in action:
        return 'logout'
    elif 'payment' in action or 'pay' in action:
        return 'payment'
    else:
        return 'other'


def get_activity_logs():
    logs = ActivityLog.query.order_by(ActivityLog.ThoiGian.desc()).limit(10).all()
    results = []
    for log in logs:
        results.append({
            'id': log.MaNhatKy,
            'user': log.user.HoTen,
            'action': log.HanhDong or '',
            'time': naturaltime(datetime.now() - log.ThoiGian) if log.ThoiGian else '',
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })
    return results


def deactivate_user(user_id):
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return False  # Không tìm thấy người dùng
    user.KichHoat = 0
    db.session.commit()
    return True


def log_order(order_id: int, user_id: int, action: str, message):
    log = OrderLog(
        MaDonHang=order_id,
        MaNguoiDung=user_id,
        HanhDong=action,
        MoTa=(f" | {message}" if message else ''),
        ThoiGian=datetime.now()
    )
    db.session.add(log)
    db.session.commit()

    return True


def get_order_logs():
    logs = OrderLog.query.order_by(OrderLog.ThoiGian.desc()).limit(10).all()
    results = []
    for log in logs:
        results.append({
            'id': log.LogId,
            'user': log.user.HoTen,
            'order': log.order.MaNhatKy,
            'action': log.HanhDong or '',
            'time': naturaltime(datetime.now() - log.ThoiGian) if log.ThoiGian else '',
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })
    return results


def get_system_logs(limit=10):
    results = []

    # User activity logs
    user_logs = ActivityLog.query.order_by(ActivityLog.ThoiGian.desc()).all()
    for log in user_logs:
        results.append({
            'id': log.MaNhatKy,
            'user': log.user.HoTen if log.user else 'System',
            'order': None,
            'action': log.HanhDong or '',
            'time': log.ThoiGian,
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })

    # Order logs
    order_logs = OrderLog.query.order_by(OrderLog.ThoiGian.desc()).all()
    for log in order_logs:
        results.append({
            'id': log.LogID,
            'user': log.user.HoTen if log.user else 'System',
            'order': getattr(log.order, 'MaNhatKy', None),
            'action': log.HanhDong or '',
            'time': log.ThoiGian,
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })

    results.sort(key=lambda x: x['time'], reverse=True)
    for log in results:
        log['time'] = naturaltime(datetime.now() - log['time']) if log['time'] else ''
    return results[:limit]


def add_product_reviews(user_id, product_id, comment, rating):
    review = Review(
        MaSanPham=product_id,
        MaNguoiDung=user_id,
        DiemDanhGia=rating,
        BinhLuan=comment)
    db.session.add(review)

    db.session.commit()
    return True


def get_product_reviews(product_id):
    result = []

    reviews = Review.query.filter_by(MaSanPham=product_id).all()

    for review in reviews:
        result.append({
            'id': review.MaDanhGia,
            'name': review.user.HoTen if review.user else '',
            'avatar': review.user.AnhDaiDien,
            'rating': review.DiemDanhGia,
            'comment': review.BinhLuan
        })

    return result


def check_admin_login(username, password):
    admin = Admin.query.filter(
        or_(
            Admin.TenDangNhap == username,
            Admin.Email == username
        )
    ).first()
    if admin :
        return admin
    return None


def add_admin(fullname, username, password, email, sdt, avatar):
    password = generate_password_hash(password.strip())
    admin = Admin(
        HoTen=fullname,
        TenDangNhap=username,
        MatKhau=password,
        Email=email,
        SoDienThoai=sdt,
        AnhDaiDien=avatar
    )
    db.session.add(admin)
    db.session.commit()
    return admin


def get_admin(admin_id):
    admin =  Admin.query.get(admin_id)
    return admin