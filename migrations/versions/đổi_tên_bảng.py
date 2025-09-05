"""rename tables and columns to Vietnamese names

Revision ID: rename_to_vietnamese
Revises: previous_revision_id
Create Date: 2025-08-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'rename_to_vietnamese'
down_revision = '22a962164928'
branch_labels = None
depends_on = None


def upgrade():
    # ============================
    # Rename tables
    # ============================
    op.rename_table('Admins', 'QuanTriVien')
    op.rename_table('Users', 'NguoiDung')
    op.rename_table('ActivityLogs', 'NhatKyHoatDong')
    op.rename_table('AdminLogs', 'NhatKyQuanTri')
    op.rename_table('UserAddresses', 'DiaChiNguoiDung')
    op.rename_table('Brands', 'ThuongHieu')
    op.rename_table('Categories', 'DanhMuc')
    op.rename_table('Products', 'SanPham')
    op.rename_table('ProductImages', 'HinhAnhSanPham')
    op.rename_table('ProductVariants', 'BienTheSanPham')
    op.rename_table('Reviews', 'DanhGia')
    op.rename_table('Wishlists', 'YeuThich')
    op.rename_table('Carts', 'GioHang')
    op.rename_table('CartItems', 'ChiTietGioHang')
    op.rename_table('Orders', 'DonHang')
    op.rename_table('OrderLogs', 'NhatKyDonHang')
    op.rename_table('PendingOrders', 'DonHangTam')
    op.rename_table('OrderDetails', 'ChiTietDonHang')
    op.rename_table('Payments', 'ThanhToan')
    op.rename_table('ShippingInfo', 'VanChuyen')
    op.rename_table('Coupons', 'MaGiamGia')
    op.rename_table('sysdiagrams', 'SodoHeThong')
    op.rename_table('otp', 'OTP')


def downgrade():
    # ============================
    # Revert table names
    # ============================
    op.rename_table('QuanTriVien', 'Admins')
    op.rename_table('NguoiDung', 'Users')
    op.rename_table('NhatKyHoatDong', 'ActivityLogs')
    op.rename_table('NhatKyQuanTri', 'AdminLogs')
    op.rename_table('DiaChiNguoiDung', 'UserAddresses')
    op.rename_table('ThuongHieu', 'Brands')
    op.rename_table('DanhMuc', 'Categories')
    op.rename_table('SanPham', 'Products')
    op.rename_table('HinhAnhSanPham', 'ProductImages')
    op.rename_table('BienTheSanPham', 'ProductVariants')
    op.rename_table('DanhGia', 'Reviews')
    op.rename_table('YeuThich', 'Wishlists')
    op.rename_table('GioHang', 'Carts')
    op.rename_table('ChiTietGioHang', 'CartItems')
    op.rename_table('DonHang', 'Orders')
    op.rename_table('NhatKyDonHang', 'OrderLogs')
    op.rename_table('DonHangTam', 'PendingOrders')
    op.rename_table('ChiTietDonHang', 'OrderDetails')
    op.rename_table('ThanhToan', 'Payments')
    op.rename_table('VanChuyen', 'ShippingInfo')
    op.rename_table('MaGiamGia', 'Coupons')
    op.rename_table('SodoHeThong', 'sysdiagrams')
    op.rename_table('OTP', 'otp')


