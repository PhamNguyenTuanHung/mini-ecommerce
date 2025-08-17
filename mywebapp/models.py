from typing import List, Optional
from sqlalchemy import Boolean, DECIMAL, DateTime, ForeignKeyConstraint, Identity, Index, Integer, LargeBinary, \
    PrimaryKeyConstraint, Unicode, text, nullslast, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import datetime
import decimal
from flask_login import UserMixin
from sqlalchemy import Float

from mywebapp import db

class Admin(db.Model):
    __tablename__ = 'Admins'
    __table_args__ = (
        PrimaryKeyConstraint('MaAdmin', name='PK__Admins__49341E382B7F4695'),
        Index('UQ__Admins__55F68FC0833EAA66', 'TenDangNhap', unique=True)
    )

    MaAdmin: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    TenDangNhap: Mapped[str] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'))
    MatKhau: Mapped[str] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
    Email: Mapped[Optional[str]] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))

class User(db.Model,UserMixin):
    __tablename__ = 'Users'
    __table_args__ = (
        PrimaryKeyConstraint('MaNguoiDung', name='PK__Users__C539D7627230A36B'),
        Index('UQ__Users__55F68FC0B53F699C', 'TenDangNhap', unique=True),
        Index('UQ__Users__A9D105340FEC9F7B', 'Email', unique=True)
    )

    MaNguoiDung: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    HoTen: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))
    Email: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))
    TenDangNhap: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'), server_default=text("(N'unknown')"))
    MatKhau: Mapped[str] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
    SoDienThoai: Mapped[Optional[str]] = mapped_column(Unicode(20, 'Vietnamese_CI_AS'))
    NgayTao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))
    AnhDaiDien: Mapped[Optional[str]] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'),server_default=text("(N'unknown')"))
    VaiTro: Mapped[Optional[str]] = mapped_column(Unicode(20, 'Vietnamese_CI_AS'), server_default=text("('Customer')"))
    KichHoat: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('((1))'))
    LanCuoiHoatDong: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime,server_default=text("CURRENT_TIMESTAMP"))

    activity_logs: Mapped[List['ActivityLog']] = relationship('ActivityLog', back_populates='user')
    user_addresses: Mapped[List['UserAddress']] = relationship('UserAddress', back_populates='user')
    carts: Mapped[List['Cart']] = relationship('Cart', back_populates='user')
    orders: Mapped[List['Order']] = relationship('Order', back_populates='user')
    reviews: Mapped[List['Review']] = relationship('Review', back_populates='user')
    wishlists: Mapped[List['Wishlist']] = relationship('Wishlist', back_populates='user')
    order_logs: Mapped[List['OrderLog']] = relationship('OrderLog', back_populates='user')


    def get_id(self):
        return str(self.MaNguoiDung)


class ActivityLog(db.Model):
        __tablename__ = 'ActivityLogs'
        __table_args__ = (
            ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__ActivityL__MaNgu__76969D2E'),
            PrimaryKeyConstraint('MaNhatKy', name='PK__Activity__E42EF42E3A6451C9')
        )

        MaNhatKy: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
        MaNguoiDung: Mapped[Optional[int]] = mapped_column(Integer)
        HanhDong: Mapped[Optional[str]] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
        MoTa: Mapped[Optional[str]] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
        DiaChiIP: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'))  # ✔️ giữ lại
        ThoiGian: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))

        user: Mapped[Optional['User']] = relationship('User', back_populates='activity_logs')


class UserAddress(db.Model):
    __tablename__ = 'UserAddresses'
    __table_args__ = (
        PrimaryKeyConstraint('MaDiaChi', name='PK__UserAddresses__MaDiaChi'),
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__UserAddresses__MaNguoiDung'),
    )

    MaDiaChi: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1))
    MaNguoiDung: Mapped[int] = mapped_column(Integer, nullable=False)

    TenNguoiNhan: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))
    SoDienThoai: Mapped[str] = mapped_column(Unicode(20, 'Vietnamese_CI_AS'))
    DiaChiChiTiet: Mapped[str] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
    MacDinh: Mapped[bool] = mapped_column(Boolean, server_default=text("((0))"))
    NgayTao: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('(getdate())'))

    user: Mapped["User"] = relationship("User", back_populates="user_addresses")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="user_address")

class Brand(db.Model):
    __tablename__ = 'Brands'
    __table_args__ = (
        PrimaryKeyConstraint('MaThuongHieu', name='PK__Brands__A3733E2CA0366535'),
    )

    MaThuongHieu: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    TenThuongHieu: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))

    products: Mapped[List['Product']] = relationship('Product', back_populates='brand')

class Category(db.Model):
    __tablename__ = 'Categories'
    __table_args__ = (
        PrimaryKeyConstraint('MaDanhMuc', name='PK__Categori__B37508878D2B2BD3'),
    )

    MaDanhMuc: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    TenDanhMuc: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))

    products: Mapped[List['Product']] = relationship('Product', back_populates='category')

class Product(db.Model):
    __tablename__ = 'Products'
    __table_args__ = (
        ForeignKeyConstraint(['MaDanhMuc'], ['Categories.MaDanhMuc'], name='FK__Products__MaDanh__49C3F6B7'),
        ForeignKeyConstraint(['MaThuongHieu'], ['Brands.MaThuongHieu'], name='FK__Products__MaThuo__4AB81AF0'),
        PrimaryKeyConstraint('MaSanPham', name='PK__Products__FAC7442D2EEE2592')
    )

    MaSanPham: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    TenSanPham: Mapped[str] = mapped_column(Unicode(150, 'Vietnamese_CI_AS'))
    Gia: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    MoTaNgan: Mapped[Optional[str]] = mapped_column(Unicode(collation='Vietnamese_CI_AS'))
    MoTa: Mapped[Optional[str]] = mapped_column(Unicode(collation='Vietnamese_CI_AS'))
    MaDanhMuc: Mapped[Optional[int]] = mapped_column(Integer)
    MaThuongHieu: Mapped[Optional[int]] = mapped_column(Integer)
    HinhAnh: Mapped[Optional[str]] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
    DiemDanhGia: Mapped[Optional[float]] = mapped_column( Float ,nullable=True )

    brand: Mapped[Optional['Brand']] = relationship('Brand', back_populates='products')
    category: Mapped[Optional['Category']] = relationship('Category', back_populates='products')
    cart_items: Mapped[List['CartItem']] = relationship('CartItem', back_populates='product')
    order_details: Mapped[List['OrderDetail']] = relationship('OrderDetail', back_populates='product')
    product_images: Mapped[List['ProductImage']] = relationship('ProductImage', back_populates='product')
    product_variants: Mapped[List['ProductVariant']] = relationship('ProductVariant', back_populates='product')
    reviews: Mapped[List['Review']] = relationship('Review', back_populates='product')
    wishlists: Mapped[List['Wishlist']] = relationship('Wishlist', back_populates='product')

    def get_rating(self):
        reviews =  Review.query.filter_by(MaSanPham=self.MaSanPham).all()
        avg_rating = sum(reviews.DiemDanhGia)/len(reviews)
        return avg_rating

class ProductImage(db.Model):
    __tablename__ = 'ProductImages'
    __table_args__ = (
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__ProductIm__MaSan__4E88ABD4'),
        PrimaryKeyConstraint('MaHinhAnh', name='PK__ProductI__A9C37A9B4940CA95')
    )

    MaHinhAnh: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    DuongDan: Mapped[str] = mapped_column(Unicode(255, 'Vietnamese_CI_AS'))
    MaSanPham: Mapped[Optional[int]] = mapped_column(Integer)
    LaChinh: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('((0))'))
    ThuTu: Mapped[Optional[int]] = mapped_column(Integer)

    product: Mapped[Optional['Product']] = relationship('Product', back_populates='product_images')

class ProductVariant(db.Model):
    __tablename__ = 'ProductVariants'
    __table_args__ = (
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__ProductVa__MaSan__52593CB8'),
        PrimaryKeyConstraint('MaSanPham', 'KichThuoc', 'MauSac', name='PK__ProductV_Custom')
    )

    MaSanPham: Mapped[int] = mapped_column(Integer)
    KichThuoc: Mapped[str] = mapped_column(Unicode(10, 'Vietnamese_CI_AS'))
    MauSac: Mapped[str] = mapped_column(Unicode(30, 'Vietnamese_CI_AS'))
    SoLuongTon: Mapped[int] = mapped_column(Integer, server_default=text('((0))'))

    product: Mapped[Optional['Product']] = relationship('Product', back_populates='product_variants')

class Review(db.Model):
    __tablename__ = 'Reviews'
    __table_args__ = (
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__Reviews__MaNguoi__71D1E811'),
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__Reviews__MaSanPh__72C60C4A'),
        PrimaryKeyConstraint('MaDanhGia', name='PK__Reviews__AA9515BFAC60D49C')
    )

    MaDanhGia: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaNguoiDung: Mapped[Optional[int]] = mapped_column(Integer)
    MaSanPham: Mapped[Optional[int]] = mapped_column(Integer)
    DiemDanhGia: Mapped[Optional[int]] = mapped_column(Integer)
    BinhLuan: Mapped[Optional[str]] = mapped_column(Unicode(collation='Vietnamese_CI_AS'))
    NgayDanhGia: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))

    user: Mapped[Optional['User']] = relationship('User', back_populates='reviews')
    product: Mapped[Optional['Product']] = relationship('Product', back_populates='reviews')

class Wishlist(db.Model):
    __tablename__ = 'Wishlists'
    __table_args__ = (
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__Wishlists__MaNgu__7A672E12'),
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__Wishlists__MaSan__7B5B524B'),
        PrimaryKeyConstraint('MaYeuThich', name='PK__Wishlist__B9007E4C4F051DF3')
    )

    MaYeuThich: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaNguoiDung: Mapped[Optional[int]] = mapped_column(Integer)
    MaSanPham: Mapped[Optional[int]] = mapped_column(Integer)
    NgayThem: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))

    user: Mapped[Optional['User']] = relationship('User', back_populates='wishlists')
    product: Mapped[Optional['Product']] = relationship('Product', back_populates='wishlists')

class Cart(db.Model):
    __tablename__ = 'Carts'
    __table_args__ = (
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__Carts__MaNguoiDu__5629CD9C'),
        PrimaryKeyConstraint('MaGioHang', name='PK__Carts__F5001DA3F7D9E2D5')
    )

    MaGioHang: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaNguoiDung: Mapped[Optional[int]] = mapped_column(Integer)
    NgayTao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))

    user: Mapped[Optional['User']] = relationship('User', back_populates='carts')
    cart_items: Mapped[List['CartItem']] = relationship('CartItem', back_populates='cart')

class CartItem(db.Model):
    __tablename__ = 'CartItems'
    __table_args__ = (
        ForeignKeyConstraint(['MaGioHang'], ['Carts.MaGioHang'], name='FK__CartItems__MaGio__59FA5E80'),
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__CartItems__MaSan__5AEE82B9'),
        PrimaryKeyConstraint('MaGioHang', 'MaSanPham', 'KichThuoc', 'MauSac', name='PK__CartItems_Composite'),
    )

    SoLuong: Mapped[int] = mapped_column(Integer)
    MaGioHang: Mapped[int] = mapped_column(Integer)
    MaSanPham: Mapped[int] = mapped_column(Integer)
    KichThuoc: Mapped[str] = mapped_column(Unicode(10, 'Vietnamese_CI_AS'), server_default=text("'M'"))
    MauSac: Mapped[str] = mapped_column(Unicode(30, 'Vietnamese_CI_AS'), server_default=text("N'Trắng'"))
    NgayThem: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))

    cart: Mapped[Optional['Cart']] = relationship('Cart', back_populates='cart_items')
    product: Mapped[Optional['Product']] = relationship('Product', back_populates='cart_items')

class Order(db.Model):
    __tablename__ = 'Orders'
    __table_args__ = (
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__Orders__MaNguoiD__619B8048'),
        ForeignKeyConstraint(['MaDiaChi'], ['UserAddresses.MaDiaChi'], name='FK__Orders__MaDiaChi'),
        PrimaryKeyConstraint('MaDonHang', name='PK__Orders__129584AD840D3CD7')
    )

    MaDonHang: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    TongTien: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    MaNguoiDung: Mapped[Optional[int]] = mapped_column(Integer)
    MaDiaChi: Mapped[Optional[int]] = mapped_column(Integer)
    NgayDat: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))
    TrangThai: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'), server_default=text("(N'Pending')"))
    PhiVanChuyen: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2), server_default=text('((0))'))
    GiamGia: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(10, 2), server_default=text('((0))'))

    user: Mapped[Optional['User']] = relationship('User', back_populates='orders')
    order_logs: Mapped[List['OrderLog']] = relationship('OrderLog', back_populates='order')
    order_details: Mapped[List['OrderDetail']] = relationship('OrderDetail', back_populates='order')
    payment: Mapped[Optional['Payment']] = relationship('Payment', back_populates='order')
    shipping_infos: Mapped[List['ShippingInfo']] = relationship('ShippingInfo', back_populates='order')
    user_address: Mapped[Optional["UserAddress"]] = relationship("UserAddress", back_populates="orders")

class OrderLog(db.Model):
    __tablename__ = 'OrderLogs'
    __table_args__ = (
        ForeignKeyConstraint(['MaDonHang'], ['Orders.MaDonHang'], name='FK__OrderLogs__MaDonHang'),
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__OrderLogs__MaNguoiDung'),
        PrimaryKeyConstraint('LogID', name='PK__OrderLogs')
    )

    LogID: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaNguoiDung :Mapped[int] = mapped_column(Integer, nullable=False)
    MaDonHang: Mapped[int] = mapped_column(Integer, nullable=False)
    HanhDong: Mapped[str] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'), nullable=False)
    MoTa: Mapped[Optional[str]] = mapped_column(Unicode(100,'Vietnamese_CI_AS'))
    ThoiGian: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('(getdate())'))


    order: Mapped['Order'] = relationship('Order', back_populates='order_logs')
    user: Mapped[Optional['User']] = relationship('User', back_populates='order_logs')

class PendingOrder(db.Model):
    __tablename__ = 'PendingOrders'
    __table_args__ = (
        PrimaryKeyConstraint('MaDonHangTam', name='PK__PendingOrders__MaDonHangTam'),
        ForeignKeyConstraint(['MaNguoiDung'], ['Users.MaNguoiDung'], name='FK__PendingOrders__MaNguoiDung'),
    )

    MaDonHangTam: Mapped[str] = mapped_column(String(100), primary_key=True)  # UUID
    MaNguoiDung: Mapped[int] = mapped_column(Integer)
    ThongTinDonHang: Mapped[dict] = mapped_column(JSON)
    ChiTietDonHang: Mapped[list] = mapped_column(JSON)
    NgayTao: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('(getdate())'))

    user: Mapped[Optional['User']] = relationship('User')

class OrderDetail(db.Model):
    __tablename__ = 'OrderDetails'
    __table_args__ = (
        ForeignKeyConstraint(['MaDonHang'], ['Orders.MaDonHang'], name='FK__OrderDeta__MaDon__6477ECF3'),
        ForeignKeyConstraint(['MaSanPham'], ['Products.MaSanPham'], name='FK__OrderDeta__MaSan__656C112C'),
        PrimaryKeyConstraint('MaChiTietDonHang', name='PK__OrderDet__4B0B45DDB7F0541F')
    )

    MaChiTietDonHang: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    SoLuong: Mapped[int] = mapped_column(Integer)
    DonGia: Mapped[decimal.Decimal] = mapped_column(DECIMAL(10, 2))
    MaDonHang: Mapped[Optional[int]] = mapped_column(Integer)
    MaSanPham: Mapped[Optional[int]] = mapped_column(Integer)
    KichThuoc: Mapped[str] = mapped_column(Unicode(10, 'Vietnamese_CI_AS'), server_default=text("'M'"))
    MauSac: Mapped[str] = mapped_column(Unicode(30, 'Vietnamese_CI_AS'), server_default=text("N'Trắng'"))

    order: Mapped[Optional['Order']] = relationship('Order', back_populates='order_details')
    product: Mapped[Optional['Product']] = relationship('Product', back_populates='order_details')


class Payment(db.Model):
    __tablename__ = 'Payments'
    __table_args__ = (
        ForeignKeyConstraint(['MaDonHang'], ['Orders.MaDonHang'], name='FK__Payments__MaDonH__693CA210'),
        PrimaryKeyConstraint('MaThanhToan', name='PK__Payments__D4B2584485145D73'),
        Index('UQ__Payments__129584AC11EE70C2', 'MaDonHang', unique=True)
    )

    MaThanhToan: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaDonHang: Mapped[Optional[int]] = mapped_column(Integer)
    PhuongThuc: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'))
    TrangThaiThanhToan: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'))
    NgayThanhToan: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    order: Mapped[Optional['Order']] = relationship('Order', back_populates='payment')


class ShippingInfo(db.Model):
    __tablename__ = 'ShippingInfo'
    __table_args__ = (
        ForeignKeyConstraint(['MaDonHang'], ['Orders.MaDonHang'], name='FK__ShippingI__MaDon__6E01572D'),
        PrimaryKeyConstraint('MaVanChuyen', name='PK__Shipping__4B22972D53DF9B99'),
        Index('UQ__Shipping__129584ACD0934B72', 'MaDonHang', unique=True)
    )

    MaVanChuyen: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaDonHang: Mapped[Optional[int]] = mapped_column(Integer)
    TenNguoiNhan: Mapped[Optional[str]] = mapped_column(Unicode(100, 'Vietnamese_CI_AS'))
    SoDienThoai: Mapped[Optional[str]] = mapped_column(Unicode(20, 'Vietnamese_CI_AS'))
    DiaChi: Mapped[Optional[str]] = mapped_column(Unicode(collation='Vietnamese_CI_AS'))
    TrangThaiVanChuyen: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'), server_default=text("(N'Chờ giao')"))
    NgayGiao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)

    order: Mapped[Optional['Order']] = relationship('Order', back_populates='shipping_infos')

class Coupon(db.Model):
    __tablename__ = 'Coupons'
    __table_args__ = (
        PrimaryKeyConstraint('MaGiamGia', name='PK__Coupons__EF9458E45A2D4CFE'),
        Index('UQ__Coupons__747065BB7F4D76D4', 'MaGiam', unique=True)
    )

    MaGiamGia: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    MaGiam: Mapped[Optional[str]] = mapped_column(Unicode(50, 'Vietnamese_CI_AS'))
    PhanTramGiam: Mapped[Optional[int]] = mapped_column(Integer)
    NgayHetHan: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)


class Sysdiagram(db.Model):
    __tablename__ = 'sysdiagrams'
    __table_args__ = (
        PrimaryKeyConstraint('diagram_id', name='PK__sysdiagr__C2B05B6156749D6D'),
        Index('UK_principal_name', 'principal_id', 'name', unique=True)
    )

    name: Mapped[str] = mapped_column(Unicode(128, 'Vietnamese_CI_AS'))
    principal_id: Mapped[int] = mapped_column(Integer)
    diagram_id: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    version: Mapped[Optional[int]] = mapped_column(Integer)
    definition: Mapped[Optional[bytes]] = mapped_column(LargeBinary)










