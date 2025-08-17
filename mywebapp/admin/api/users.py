# admin/api/users.py
from cloudinary import uploader
from flask import jsonify, request, flash
from flask_login import login_required, current_user

from mywebapp.admin.api import admin_api
from mywebapp import utils


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)

    return decorated


@admin_api.route('/users', methods=['GET'])
# @login_required
# @admin_required
def get_users():
    users = utils.get_users()
    return jsonify(users)


@admin_api.route('/users', methods=['POST'])
# @login_required
# @admin_required
def add_user():
    fullname = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    sdt = request.form.get('phone', '').strip()
    avatar = request.files.get('avatar')

    # Avatar mặc định
    avatar_path = "https://res.cloudinary.com/dmwhvc8tc/image/upload/v1753408922/user_avatar/avatar_default.png"

    # Kiểm tra thông tin đầu vào
    if utils.is_username_exist(username):
        flash("Đã tồn tại tài khoản", "danger")
    elif utils.is_email_exist(email):
        flash("Email này đã được đăng ký", "danger")
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

        utils.log_activity(user.MaNguoiDung, 'register', f'Đăng ký thành công với username: {username}')
    return {'success': True}


@admin_api.route('/users/<int:user_id>', methods=['GET'])
# @login_required
# @admin_required
def get_user_by_id(user_id):
    user = utils.get_user_detail_by_id(user_id)
    return jsonify(user)


@admin_api.route('/users/<int:user_id>/deactivate', methods=['POST'])
# @login_required
# @admin_required
def deactivate_user(user_id):
    if utils.deactivate_user(user_id):
        utils.log_activity(
            user_id=user_id,
            action='deactivate_user',
            message=f'Vô hiệu hóa tài khoản User ID={user_id}',
            ip=request.remote_addr
        )
    return jsonify({'success': True})


@admin_api.route('/users/<int:user_id>', methods=['PUT'])
# @login_required
# @admin_required
def update_user(user_id):
    # Lấy thông tin user cũ
    old_user = utils.get_user_by_id(user_id)
    if not old_user:
        return {'success': False, 'error': 'User không tồn tại'}, 404

    # Lấy dữ liệu từ form
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    avatar_file = request.files.get('avatar')
    avatar_url_form = request.form.get('avatar_url', '').strip()
    status_raw = request.form.get('status', 'false')

    avatar_url_default = "https://res.cloudinary.com/dmwhvc8tc/image/upload/v1753408922/user_avatar/avatar_default.png"
    status = status_raw.lower() in ['1', 'true', 'yes', 'on']

    new_avatar_url = old_user.AnhDaiDien

    # Nếu có file ảnh mới → upload
    if avatar_file and avatar_file.filename != '' and avatar_file.mimetype.startswith('image/'):
        try:
            res = uploader.upload(
                avatar_file,
                folder="user_avatar",
                public_id=f"user_{user_id}_avatar",
                overwrite=True
            )
            new_avatar_url = res['secure_url']
        except Exception:
            return {'success': False, 'error': 'Upload ảnh thất bại'}, 400
    elif avatar_url_form:
        new_avatar_url = avatar_url_form
    elif not avatar_url_form and not avatar_file:
        if old_user.AnhDaiDien != avatar_url_default:
            new_avatar_url = avatar_url_default

    changes = []
    if old_user.HoTen != name:
        changes.append(f"Họ tên: '{old_user.HoTen}' → '{name}'")
    if old_user.Email != email:
        changes.append(f"Email: '{old_user.Email}' → '{email}'")
    if old_user.SoDienThoai != phone:
        changes.append(f"SĐT: '{old_user.SoDienThoai}' → '{phone}'")
    if old_user.AnhDaiDien != new_avatar_url:
        changes.append("Ảnh đại diện: thay đổi")
    if bool(old_user.KichHoat) != status:
        changes.append(
            f"Trạng thái: {'Active' if old_user.KichHoat else 'Inactive'} → {'Active' if status else 'Inactive'}")

    change_message = "; ".join(changes) if changes else "Không có thay đổi"
    # Cập nhật DB
    updated_user = utils.update_user(
        user_id=user_id,
        name=name,
        email=email,
        phone=phone,
        avatar=new_avatar_url,
        status=status
    )

    # Ghi log
    if updated_user:
        utils.log_activity(
            user_id=user_id,
            action='update_profile',
            message=f"User {user_id} cập nhật: {change_message}",
            ip=request.remote_addr
        )
        return {'success': True}
    else:
        return {'success': False, 'error': 'Cập nhật thất bại'}


# @admin_api.route('/users/<int:user_id>/status', methods=['GET'])
# # @login_required
# # @admin_required
# def get_status_user(user_id):
#     reslut = utils.get_user_by_id(user_id)


@admin_api.route('/activity-logs', methods=["GET"])
def get_activity_logs():
    result = utils.get_activity_logs()
    return result
