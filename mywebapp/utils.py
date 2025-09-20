import math
import random
import secrets
from datetime import datetime, timedelta
import requests
from sqlalchemy import func, false, desc
from flask import current_app, session, request
from werkzeug.security import check_password_hash, generate_password_hash
from mywebapp import db
from mywebapp.models import Product, Category, Brand, CartItem, Cart, User, ProductVariant, Order, OrderDetail, Payment, \
    ShippingInfo, UserAddress, ProductImage, ActivityLog, OrderLog, Review, Admin, OTP, AdminLog, Coupon, UserCoupon, \
    PendingOrder, FlashSale, FlashSaleProduct
from decimal import Decimal
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from humanize import naturaltime
import hmac, hashlib, uuid


# Category
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


# Brand

def get_brands_summary():
    rows = (
        db.session.query(
            Brand.MaThuongHieu,
            Brand.TenThuongHieu,
            func.coalesce(func.sum(OrderDetail.DonGia * OrderDetail.SoLuong), 0).label('revenue')
        )
        .outerjoin(Product, Product.MaThuongHieu == Brand.MaThuongHieu)
        .outerjoin(OrderDetail, OrderDetail.MaSanPham == Product.MaSanPham)
        .group_by(Brand.MaThuongHieu, Brand.TenThuongHieu)
        .all()
    )

    return [
        {'id': brand_id, 'name': name, 'revenue': revenue or 0}
        for brand_id, name, revenue in rows
    ]


def get_brands():
    brands = Brand.query.all()
    return [
        {
            "id": brand.MaThuongHieu,
            "name": brand.TenThuongHieu,
        }
        for brand in brands
    ]


def delete_brand(brand_id):
    brand = db.session.query(Brand).get(brand_id)
    if brand:
        db.session.delete(brand)
        db.session.commit()
        return True
    return False


def update_brand(brand_id, name):
    brand = db.session.query(Brand).get(brand_id)
    if brand:
        brand.TenThuongHieu = name
        db.session.commit()
        return True
    return False


# Product

def load_products(cate_id=None, brand_id=None, kw=None, page=1, sort_by=None):
    now = datetime.utcnow()
    query = db.session.query(Product).options(
        joinedload(Product.brand),
        joinedload(Product.category),
        joinedload(Product.flash_sales)
    )

    sales_data = dict(db.session.query(
        OrderDetail.MaSanPham,
        func.sum(OrderDetail.SoLuong)
    ).group_by(OrderDetail.MaSanPham).all())

    if cate_id:
        query = query.filter(Product.MaDanhMuc == cate_id)
    if brand_id:
        query = query.filter(Product.MaThuongHieu == brand_id)
    if kw:
        query = query.filter(Product.TenSanPham.ilike(f"%{kw}%"))

    if sort_by == "priceLowHigh":
        query = query.order_by(Product.DonGia.asc())
    elif sort_by == "priceHighLow":
        query = query.order_by(Product.DonGia.desc())
    elif sort_by == "newest":
        query = query.order_by(Product.NgayTao.desc())
    else:
        query = query.order_by(Product.MaSanPham.asc())

    page_size = current_app.config.get('PAGE_SIZE', 12)
    total_items = query.count()
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    products = []
    for item in items:
        if item.TrangThaiHienThi:
            # Lấy thông tin giá bằng hàm get_price_info() của product
            price_info = item.get_price_info()

            products.append({
                'id': item.MaSanPham,
                'name': item.TenSanPham,
                'price': price_info['price'],  # Giá gốc
                'price_after_discount': price_info['price_after_discount'],  # Giá cuối
                'sale_percent': price_info['sale_percent'],  # % giảm cuối cùng
                'image': item.HinhAnh,
                'description': item.MoTa,
                'brand': {
                    'id': item.brand.MaThuongHieu,
                    'name': item.brand.TenThuongHieu
                } if item.brand else None,
                'category': {
                    'id': item.category.MaDanhMuc,
                    'name': item.category.TenDanhMuc
                } if item.category else None,
                'rating': item.get_rating(),
                'new': item.is_new(),
                'quantity_sold': sales_data.get(item.MaSanPham, 0)
            })

    if sort_by == "bestseller":
        products.sort(key=lambda p: p["quantity_sold"], reverse=True)

    return {
        "products": products,
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page
    }


def get_gallery(product_id):
    images = ProductImage.query.filter_by(MaSanPham=product_id).all()
    return [img.DuongDan for img in images]


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


def get_products_full():
    products = (
        Product.query
        .options(
            joinedload(Product.brand),
            joinedload(Product.category),
            joinedload(Product.product_variants),
            joinedload(Product.flash_sales),
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

        gallery_images = get_gallery(product.MaSanPham)

        price_after_discount = product.DonGia
        if product.GiaGiam:
            price_after_discount = product.DonGia - (product.DonGia * product.GiaGiam / 100)

        result.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'stock': total_stock,
            'price': product.DonGia,
            'price_after_discount': price_after_discount,
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
            'variants': variants,
            'gallery_images': gallery_images,
            'sale': product.GiaGiam or 0,
            'publish': product.TrangThaiHienThi
        })

    result.sort(key=lambda x: x['id'])
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


def get_product_by_id(product_id):
    product = Product.query.get(product_id)
    price_info = product.get_price_info()

    return {
        'id': product.MaSanPham,
        'name': product.TenSanPham,
        'price': price_info['price'],
        'price_after_discount': price_info['price_after_discount'],
        'sale_percent': price_info['sale_percent'],
        'image': product.HinhAnh,
        'description': product.MoTa,
        'brand': {
            'id': product.brand.MaThuongHieu,
            'name': product.brand.TenThuongHieu
        } if product.brand else None,
        'category': {
            'id': product.category.MaDanhMuc,
            'name': product.category.TenDanhMuc
        } if product.category else None,
        'rating': product.get_rating(),
    }


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
    return {
        "id": product_id,
        "color": color,
        "size": size,
        "quantity": variant.SoLuongTon if variant else 0}


def get_best_sellers(limit=8):
    now = datetime.utcnow()
    sales_subq = (
        db.session.query(
            OrderDetail.MaSanPham,
            func.sum(OrderDetail.SoLuong).label("quantity_sold")
        )
        .group_by(OrderDetail.MaSanPham)
        .subquery()
    )

    flash_subq = (
        db.session.query(
            FlashSaleProduct.MaSanPham,
            FlashSale.GiaGiam.label("flash_sale")
        )
        .join(FlashSale, FlashSale.MaKhuyenMai == FlashSaleProduct.MaKhuyenMai)
        .filter(FlashSale.NgayBatDau <= now, FlashSale.NgayKetThuc >= now)
        .subquery()
    )

    query = (
        db.session.query(
            Product,
            func.coalesce(sales_subq.c.quantity_sold, 0).label("quantity_sold"),
            func.coalesce(flash_subq.c.flash_sale, Product.GiaGiam).label("sale")
        )
        .outerjoin(sales_subq, Product.MaSanPham == sales_subq.c.MaSanPham)
        .outerjoin(flash_subq, Product.MaSanPham == flash_subq.c.MaSanPham)
        .order_by(func.coalesce(sales_subq.c.quantity_sold, 0).desc())
        .limit(limit)
    )

    results = []
    for product, quantity_sold, sale in query.all():
        price_after_discount = product.DonGia - product.DonGia * (sale / 100) if sale else product.DonGia
        results.append({
            "id": product.MaSanPham,
            "name": product.TenSanPham,
            "price": product.DonGia,
            "sale": sale,
            "price_after_discount": price_after_discount,
            "quantity_sold": quantity_sold,
            "image": product.HinhAnh,
            "brand": {
                "id": product.brand.MaThuongHieu,
                "name": product.brand.TenThuongHieu
            },
            "category": {
                "id": product.category.MaDanhMuc,
                "name": product.category.TenDanhMuc
            },
            'new': product.is_new()
        })
    return results


def get_best_rated(limit=8):
    now = datetime.utcnow()

    products = Product.query.all()

    products.sort(key=lambda p: p.get_rating(), reverse=True)

    results = []
    for product in products:
        if len(results) >= 8:
            break
        active_flash_sale = next(
            (fs for fs in product.flash_sales if fs.NgayBatDau <= now <= fs.NgayKetThuc),
            None
        )
        flash_sale_percent = active_flash_sale.GiaGiam if active_flash_sale else 0
        final_sale_percent = flash_sale_percent or product.GiaGiam or 0
        price_after_discount = product.DonGia - product.DonGia * (
                    final_sale_percent / 100) if final_sale_percent else product.DonGia

        results.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'price': product.DonGia,
            'price_after_discount': price_after_discount,
            'sale': final_sale_percent,
            'image': product.HinhAnh,
            'description': product.MoTa,
            'brand': {
                'id': product.brand.MaThuongHieu,
                'name': product.brand.TenThuongHieu
            } if product.brand else None,
            'category': {
                'id': product.category.MaDanhMuc,
                'name': product.category.TenDanhMuc
            } if product.category else None,
            'new': product.is_new()
        })
    return results


def get_newest_products(limit=8):
    query = (
        Product.query
        .order_by(Product.NgayTao.desc())
        .limit(limit)
        .all()
    )
    now = datetime.utcnow()
    results = []

    for product in query:
        active_flash_sale = next(
            (fs for fs in product.flash_sales if fs.NgayBatDau <= now <= fs.NgayKetThuc),
            None
        )
        sale_percent = active_flash_sale.GiaGiam if active_flash_sale else 0
        price_after_discount = product.DonGia - product.DonGia * (
                    sale_percent / 100) if sale_percent else product.DonGia

        results.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'price': product.DonGia,
            'price_after_discount': price_after_discount,
            'sale': sale_percent,
            'image': product.HinhAnh,
            'description': product.MoTa,
            'brand': {
                'id': product.brand.MaThuongHieu,
                'name': product.brand.TenThuongHieu
            } if product.brand else None,
            'category': {
                'id': product.category.MaDanhMuc,
                'name': product.category.TenDanhMuc
            } if product.category else None,
            'new': product.is_new()
        })
    return results


def get_flash_sale_products(limit=8):
    now = datetime.utcnow()
    products = (
        db.session.query(
            Product,
            FlashSale.GiaGiam
        )
        .join(FlashSaleProduct, FlashSaleProduct.MaSanPham == Product.MaSanPham)
        .join(FlashSale, FlashSale.MaKhuyenMai == FlashSaleProduct.MaKhuyenMai)
        .filter(FlashSale.NgayBatDau <= now, FlashSale.NgayKetThuc >= now)
        .limit(limit)
        .all()
    )
    result = []
    for product, sale in products:
        price_after_discount = product.DonGia - product.DonGia * (sale / 100)
        result.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'price': product.DonGia,
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
            'sale': sale,
            'price_after_discount': price_after_discount
        })
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


def create_products(name, price, description, category_id, brand_id, sale=None, publish=1):
    new_product = Product(
        TenSanPham=name,
        DonGia=price,
        MoTa=description,
        MaDanhMuc=category_id,
        MaThuongHieu=brand_id,
        GiamGia=sale,
        TrangThaiHienThi=publish
    )
    db.session.add(new_product)
    db.session.commit()
    return new_product


def update_product_image(product_id, img):
    product = Product.query.get(product_id)
    product.HinhAnh = img
    db.session.commit()


def add_product_variants(product_id, variants):
    for v in variants:
        kich_thuoc = v.get('size') or v.get('KichThuoc')
        mau_sac = v.get('color') or v.get('MauSac')
        so_luong = v.get('stock') or v.get('SoLuongTon', 0)

        if not kich_thuoc or not mau_sac:
            return {"success": False, "error": "Biến thể phải có cả Màu sắc và Kích thước"}

        variant = ProductVariant(
            MaSanPham=product_id,
            KichThuoc=kich_thuoc,
            MauSac=mau_sac,
            SoLuongTon=so_luong
        )
        db.session.add(variant)
    db.session.commit()


def add_product_images(product_id, images):
    for image in images:
        product_image = ProductImage(
            MaSanPham=product_id,
            DuongDan=image
        )
        db.session.add(product_image)
    db.session.commit()


def update_product(product_id, name, price, description, category_id, brand_id, main_img=None, variants=None,
                   gallery=None, sale=None, publish=None):
    variants = variants or []
    gallery = gallery or []

    try:
        product = Product.query.get(product_id)
        if not product:
            return {"success": False, "error": "Không tìm thấy sản phẩm"}

        product.TenSanPham = name
        product.DonGia = price
        product.MoTa = description
        product.MaDanhMuc = category_id
        product.MaThuongHieu = brand_id
        product.GiaGiam = 0 if sale is None else sale
        product.TrangThaiHienThi = 1 if publish else 0

        if main_img:
            product.HinhAnh = main_img

        old_gallery = ProductImage.query.filter_by(MaSanPham=product_id).all()
        for img in old_gallery:
            db.session.delete(img)

        for img_url in gallery:
            img = ProductImage(MaSanPham=product_id, DuongDan=img_url)
            db.session.add(img)

        existing_variants = {(v.KichThuoc, v.MauSac): v for v in
                             ProductVariant.query.filter_by(MaSanPham=product_id).all()}
        updated_keys = set()

        for v in variants:
            size = v.get('size') or v.get('KichThuoc')
            color = v.get('color') or v.get('MauSac')
            stock = int(v.get('stock') or v.get('SoLuongTon', 0))

            if not size or not color:
                raise ValueError("Biến thể phải có cả Màu sắc và Kích thước")

            key = (size, color)
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

        for key, variant in existing_variants.items():
            if key not in updated_keys:
                db.session.delete(variant)

        db.session.commit()
        return {"success": True, "id": product_id}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}


def count_products():
    return db.session.query(Product).count()


def related_products(product_id, limit=10):
    product = Product.query.get(product_id)
    if not product:
        return []

    category_id = product.category.MaDanhMuc if product.category else None
    brand_id = product.brand.MaThuongHieu if product.brand else None

    query = Product.query.filter(Product.MaSanPham != product.MaSanPham)

    if category_id or brand_id:
        query = query.filter(
            or_(
                Product.MaDanhMuc == category_id,
                Product.MaThuongHieu == brand_id
            )
        )

    products = []

    for product in query.limit(limit).all():
        products.append({
            'id': product.MaSanPham,
            'name': product.TenSanPham,
            'price': product.DonGia,
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
            'rating': product.get_rating(),
        })
    return products


# User

def create_otp(email, minutes_valid=5):
    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=minutes_valid)
    otp_entry = OTP(email=email, code=code, expires_at=expires_at)
    db.session.add(otp_entry)
    db.session.commit()
    return code


def verify_otp(email, code):
    otp_entry = OTP.query.filter_by(email=email, code=code).first()
    if otp_entry and otp_entry.expires_at > datetime.utcnow():
        return True
    return False


def update_password(email, new_password):
    user = get_user_by_email(email)
    if user:
        user.MatKhau = generate_password_hash(new_password)
        db.session.commit()

        OTP.query.filter_by(email=email).delete()
        db.session.commit()
        return True
    return False


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


def get_user_by_email(email):
    user = User.query.filter_by(Email=email).first()
    return user


def delete_otp(email):
    OTP.query.filter_by(email=email).delete()
    db.session.commit()


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


def create_user_from_google(email, name, avatar=None):
    random_password = secrets.token_hex(16)
    hashed_password = generate_password_hash(random_password)

    user = User(
        HoTen=name,
        TenDangNhap=email.split('@')[0],
        MatKhau=hashed_password,
        Email=email,
        SoDienThoai=None,
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
        return None


def change_password(user_id, old_pass, new_pass):
    user = User.query.get(user_id)
    if not check_password_hash(user.MatKhau, old_pass):
        return "wrong_old_password"

    user.MatKhau = generate_password_hash(new_pass.strip())
    db.session.commit()
    return True


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
        if address.MacDinh:
            other_address = UserAddress.query.filter(
                UserAddress.MaDiaChi != address.MaDiaChi
            ).first()
            if other_address:
                other_address.MacDinh = True
        db.session.delete(address)
        db.session.commit()
        return True
    return False


def add_address(user_id, name, address, phone, is_default=False):
    if is_default:
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

    if not user:
        return None, "Tài khoản không tồn tại"

    if not check_password_hash(user.MatKhau, password):
        return None, "Mật khẩu không đúng"

    if not user.KichHoat:
        return None, "Tài khoản bị vô hiệu"

    return user, "Đăng nhập thành công"


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


# Cart
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

            # Lấy giá cuối cùng (có sale / flash sale)
            price_info = product.get_price_info()
            final_price = price_info['price_after_discount']

            cart_dict[item_key] = {
                'key': item_key,
                'product_id': product_id,
                'name': product.TenSanPham,
                'image': product.HinhAnh,
                'price': float(final_price),
                'quantity': quantity,
                'size': size,
                'color': color
            }
    else:
        # Lấy từ session cart
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
    quantity = item.get('quantity', 1)
    product = Product.query.get(product_id)
    if not product:
        raise ValueError("Sản phẩm không tồn tại")

    price_info = product.get_price_info()
    final_price = price_info['price_after_discount']
    print(final_price)

    key = f'{product_id}_{size}_{color}'

    if key in cart:
        cart[key]['quantity'] += quantity
    else:
        cart[key] = {
            'product_id': product_id,
            'name': product.TenSanPham,
            'price': float(final_price),
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


# Order
def get_orders_by_user_id(user_id):
    orders = Order.query.options(
        joinedload(Order.user),
        joinedload(Order.user_address),
        joinedload(Order.order_details).joinedload(OrderDetail.product),
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
        MaDiaChi=order_info['address_id'],
        MaGiamGia=order_info.get('voucher_id', None),
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

    if order_info.get('voucher_id') is not None:
        mark_voucher_used(user_id=user_id, coupon_id=order_info.get('voucher_id'))
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
    if status == 'delivered':
        order.payment.TrangThaiThanhToan = 'Đã thanh toán'
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

    ngrok = ""
    request_id = str(uuid.uuid4())
    order_info = "Thanh toán đơn hàng MoMo"
    redirect_url = f"{ngrok}/payment/return"
    ipn_url = f"{ngrok}/user/api/payment/ipn"
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


# Log activity
def log_activity(user_id: int, action: str, message: str = ''):
    log = ActivityLog(
        MaNguoiDung=user_id,
        HanhDong=action,
        MoTa=(f" | {message}" if message else ''),
        ThoiGian=datetime.now()
    )
    db.session.add(log)
    db.session.commit()


def admin_log_activity(admin_id: int, action: str, message: str = ''):
    log = AdminLog(
        MaAdmin=admin_id,
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


def get_admin_activity_logs():
    logs = ActivityLog.query.order_by(ActivityLog.ThoiGian.desc()).limit(10).all()
    results = []
    for log in logs:
        results.append({
            'id': log.MaNhatKy,
            'admin': log.admin.HoTen,
            'action': log.HanhDong or '',
            'time': naturaltime(datetime.now() - log.ThoiGian) if log.ThoiGian else '',
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })
    return results


def update_status_user(user_id, status):
    user = User.query.filter_by(MaNguoiDung=user_id).first()
    if not user:
        return False
    user.KichHoat = 1 if status == 'active' else 0
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
            'name': log.user.HoTen if log.user else 'System',
            'order': None,
            'action': log.HanhDong or '',
            'time': log.ThoiGian,
            'type': extract_action_type(log.HanhDong),
            'details': log.MoTa or ''
        })

    admin_logs = AdminLog.query.order_by(AdminLog.ThoiGian.desc()).all()
    for log in admin_logs:
        results.append({
            'id': log.MaNhatKy,
            'name': log.admin.HoTen if log.admin else 'System',
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
            'name': log.user.HoTen if log.user else 'System',
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


# Review
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


# admin
def check_admin_login(username, password):
    admin = Admin.query.filter(
        or_(
            Admin.TenDangNhap == username,
            Admin.Email == username
        )
    ).first()

    if not admin:
        return None, "Tài khoản không tồn tại"

    # if not check_password_hash(admin.MatKhau, password):
    #     return None, "Mật khẩu không đúng"

    return admin, "Đăng nhập thành công"


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
    admin = Admin.query.get(admin_id)
    return admin


def get_user_vouchers(user_id: int):
    vouchers = (
        db.session.query(Coupon)
        .join(UserCoupon, Coupon.MaGiamGia == UserCoupon.MaGiamGia)
        .filter(UserCoupon.MaNguoiDung == user_id)
        .filter(UserCoupon.DaSuDung == 0)
        .all()
    )
    return [
        {
            "id": v.MaGiamGia,
            "code": v.MaGiam,
            "discount_per": v.PhanTramGiam,
            "expiry_date": v.NgayHetHan,
            "description": v.MoTa
        }
        for v in vouchers
    ]


def mark_voucher_used(user_id, coupon_id):
    user_coupon = (
        db.session.query(UserCoupon)
        .filter(UserCoupon.MaNguoiDung == user_id)
        .filter(UserCoupon.MaGiamGia == coupon_id)
        .first()
    )
    if user_coupon:
        user_coupon.DaSuDung = 1
        db.session.commit()
        return True
    return False


def get_voucher_by_code(code):
    voucher = Coupon.query.filter_by(MaGiam=code).first()
    return voucher


def get_coupons():
    coupons = Coupon.query.all()
    data = []
    for c in coupons:
        data.append({
            "id": c.MaGiamGia,
            "code": c.MaGiam,
            "discount": c.PhanTramGiam,
            "expiry_date": c.NgayHetHan.strftime("%Y-%m-%d") if c.NgayHetHan else None,
            "description": c.MoTa
        })

    return data


def update_coupon(coupon_id, code, discount, expiry_date, description):
    coupon = Coupon.query.get(coupon_id)
    if coupon:
        coupon.MaGiam = code
        coupon.PhanTramGiam = discount
        coupon.NgayHetHan = expiry_date
        coupon.MoTa = description
        db.session.commit()
        return True
    return False


def add_coupon(code, discount, expiry_date, description):
    try:
        coupon = Coupon(
            MaGiam=code,
            PhanTramGiam=discount,
            NgayHetHan=expiry_date,
            MoTa=description
        )
        db.session.add(coupon)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print("Lỗi khi thêm coupon:", e)
        return False


def assign_voucher_to_users(user_ids: list[int], voucher_id: int):
    print(user_ids)
    new_entries = [
        UserCoupon(
            MaNguoiDung=user_id,
            MaGiamGia=voucher_id,
            NgayNhan=datetime.now(),
            DaSuDung=0
        )
        for user_id in user_ids
    ]

    db.session.bulk_save_objects(new_entries)
    db.session.commit()
    return new_entries


# pendind order

def create_pending_order(pending_order_id, user_id, order_info, order_details):
    pending_order = PendingOrder(
        MaDonHangTam=pending_order_id,
        MaNguoiDung=user_id,
        ThongTinDonHang=order_info,
        ChiTietDonHang=order_details
    )
    db.session.add(pending_order)
    db.session.commit()
    return pending_order


def delete_pending_order(ma_don_hang):
    pending_order = PendingOrder.query.filter_by(MaDonHang=ma_don_hang).first()
    if pending_order:
        db.session.delete(pending_order)
        db.session.commit()
        return True
    return False


def get_pending_order(pending_order_id):
    return PendingOrder.query.filter_by(MaDonHang=pending_order_id).first()


def get_sales():
    sales = FlashSale.query.all()
    data = []
    for sale in sales:
        data.append({
            "id": sale.MaKhuyenMai,
            "name": sale.TenKhuyenMai,
            "discount": sale.GiaGiam,
            "start": sale.NgayBatDau.strftime("%Y-%m-%dT%H:%M") if sale.NgayBatDau else None,
            "end": sale.NgayKetThuc.strftime("%Y-%m-%dT%H:%M") if sale.NgayKetThuc else None,
        })

    return data


def update_sale(sale_id, name, start, discount, end):
    sale = FlashSale.query.get(sale_id)
    if sale:
        sale.TenKhuyenMai = name
        sale.GiaGiam = discount
        sale.NgayKetThuc = end
        sale.NgayBatDau = start
        db.session.commit()
        return True
    return False


def add_sale(name, discount, start, end):
    try:
        sale = FlashSale(
            TenKhuyenMai=name,
            GiaGiam=discount,
            NgayBatDau=start,
            NgayKetThuc=end
        )
        db.session.add(sale)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print("Lỗi khi thêm coupon:", e)
        return False


def assign_sale_to_products(products, sale):
    new_entries = [
        FlashSaleProduct(
            MaKhuyenMai=sale,
            MaSanPham=product_id,
        )
        for product_id in products
    ]

    db.session.bulk_save_objects(new_entries)
    db.session.commit()
    return new_entries


def get_active_sales():
    now = datetime.utcnow()
    sale = FlashSale.query.filter(
        FlashSale.NgayBatDau <= now,
        FlashSale.NgayKetThuc >= now
    ).first()
    return {
        "id": sale.MaKhuyenMai,
        "name": sale.TenKhuyenMai,
        "discount": sale.GiaGiam,
        "start": sale.NgayBatDau.isoformat(),
        "end": sale.NgayKetThuc.isoformat()
    }
