# admin/api/orders.py

from flask import jsonify, request, session, url_for
from flask_login import login_required, current_user
from mywebapp.user.api import user_api
from mywebapp import utils



@user_api.route('/coupon/<string:code>', methods=['GET'])
@login_required
def get_coupon(code):
    voucher = utils.get_voucher_by_code(code)
    if not voucher:
        return jsonify({"error": "Voucher not found"}), 404

    return jsonify({
        "id": voucher.MaGiamGia,
        "code": voucher.MaGiam,
        "percent": voucher.PhanTramGiam,
        "expire_date": voucher.NgayHetHan.strftime("%Y-%m-%d"),
        "description": voucher.MoTa
    })