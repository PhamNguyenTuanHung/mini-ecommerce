# user/api/user_info.py
from cloudinary import uploader
from flask import jsonify, request, session, url_for
from flask_login import login_required, current_user
from mywebapp.user.api import user_api
from mywebapp import utils


@user_api.route('/address', methods=['POST'])
def add_address():
    data = request.get_json()
    name = data.get('name')
    address = data.get('address')
    phone = data.get('phone')
    is_default = data.get('is_default')
    user_id = current_user.MaNguoiDung
    new_address = utils.add_address(user_id=user_id, name=name, address=address, phone=phone, is_default=is_default)
    utils.log_activity(
        user_id,
        action='add_address',
        message='Người dùng thêm địa chỉ mới'
    )

    if new_address:
        return {'success': True,
                'address_id': new_address.MaDiaChi}
    else:
        return {'success': False}


@user_api.route('/address', methods=['PATCH'])
def update_address():
    data = request.get_json()
    address_id = data.get('id')
    name = data.get('ho_ten')
    address = data.get('dia_chi')
    sdt = data.get('sdt')
    is_default = data.get('mac_dinh')
    print(data)

    if utils.update_address(address_id, name, address, sdt, is_default):
        utils.log_activity(current_user.MaNguoiDung,
                           action='update_profile',
                           message='Cập nhật địa chỉ ')
        return jsonify({'success': True})
    else:
        return jsonify({'success': False})


@user_api.route('/address/<int:address_id>', methods=['DELETE'])
def delete_address(address_id):
    if id:
        if utils.delete_address(address_id):
            utils.log_activity(current_user.MaNguoiDung,
                               action='delete_address',
                               message='Xóa địa chỉ '
                               )

            return jsonify({'success': True})
    else:
        return jsonify({'success': False})


@user_api.route('/profile', methods=['POST'])
@login_required
def update_profile():
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
        message=f"User {current_user.MaNguoiDung} cập nhật: {change_message}"
    )

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



@user_api.route('/change-password', methods=['GET', 'POST'])
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

