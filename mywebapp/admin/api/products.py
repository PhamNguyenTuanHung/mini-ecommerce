from cloudinary import uploader
from flask import jsonify, request, json
from flask_login import login_required, current_user
from mywebapp.admin.api import admin_api
from mywebapp import utils


def admin_required(f):
    from functools import wraps
    from flask import redirect, url_for, flash
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        return f(*args, **kwargs)

    return decorated


@admin_api.route('/products', methods=['GET'])
# @login_required
def get_all_products():
    products = utils.get_all_products_with_stock()
    sales_data = utils.get_all_sales()
    return {
        'products': products,
        'sales_data': sales_data
    }


@admin_api.route('/products', methods=['POST'])
# @login_required
def create_product():
    name = request.form.get('name')
    price = request.form.get('price')
    brand = request.form.get('brand')
    category = request.form.get('category')
    description = request.form.get('description')
    variants = json.loads(request.form.get('variants', '[]'))
    image_file = request.files.get('image')
    image_url = "https://res.cloudinary.com/dmwhvc8tc/image/upload/v1753408922/product/default.jpg"

    result = utils.add_product(name, price, description, category, brand, img=image_url, variants=variants)

    if not result.get('success'):
        return jsonify(result), 400

    product_id = result['id']

    if image_file and image_file.filename != '' and image_file.mimetype.startswith('image/'):
        try:
            upload_result = uploader.upload(
                image_file,
                folder="products",
                public_id=f"product_{product_id}_main",
                overwrite=True
            )
            image_url = upload_result['secure_url']

            # B3: Cập nhật lại HinhAnh sau khi có ảnh
            from mywebapp.models import Product  # nếu chưa import
            product = Product.query.get(product_id)
            if product:
                product.HinhAnh = image_url
                utils.db.session.commit()

        except Exception as e:
            return jsonify({"success": False, "error": f"Lỗi upload ảnh: {str(e)}"}), 500

    return jsonify({"success": True, "id": product_id, "image_url": image_url})


@admin_api.route('/products/<int:product_id>', methods=['POST'])
# @login_required
# @admin_required
def update_product(product_id):
    old_product = utils.get_product_by_id(product_id)
    if not old_product:
        return {'success': False, 'error': 'Sản phẩm không tồn tại'}, 404
    name = request.form.get('name')
    price = request.form.get('price')
    brand = request.form.get('brand')
    category = request.form.get('category')
    description = request.form.get('description')
    variants = json.loads(request.form.get('variants', '[]'))
    image_url_form = request.form.get('image_url', '').strip()
    image_file = request.files.get('image')

    print(name, price, brand, category, description, variants, image_url_form, image_file)
    new_avatar_url = old_product.HinhAnh

    if image_file and image_file.filename != '' and image_file.mimetype.startswith('image/'):
        try:
            res = uploader.upload(
                image_file,
                folder="products",
                public_id=f"product{product_id}_main",
                overwrite=True
            )
            new_avatar_url = res['secure_url']
        except Exception:
            return {'success': False, 'error': 'Upload ảnh thất bại'}, 400
    elif image_url_form:
        new_avatar_url = image_url_form
    elif not image_file and not image_url_form:
        new_avatar_url = ''

    changes = []
    if old_product.TenSanPham != name:
        changes.append(f"Họ tên: '{old_product.TenSanPham}' → '{name}'")
    if old_product.Gia != price:
        changes.append(f"SĐT: '{old_product.Gia}' → '{price}'")
    if old_product.HinhAnh != new_avatar_url:
        changes.append("Ảnh đại diện: thay đổi")
    if old_product.MaThuongHieu != brand:
        changes.append(f"SĐT: '{old_product.MaThuongHieu}' → '{brand}'")
    if old_product.MaDanhMuc != category:
        changes.append(f"SĐT: '{old_product.MaDanhMuc}' → '{category}'")

    change_message = "; ".join(changes) if changes else "Không có thay đổi"

    result = utils.update_product(product_id=product_id,
                                  name=name,
                                  price=price,
                                  description=description,
                                  category_id=category,
                                  brand_id=brand,
                                  img=new_avatar_url,
                                  variants=variants)
    if result:
        # utils.log_activity(
        #     user_id=user_id,
        #     action='update_profile',
        #     message=f"User {user_id} cập nhật: {change_message}",
        #     ip=request.remote_addr
        # )
        return jsonify({'success': True})
    return jsonify({'success': False})


@admin_api.route('/products/<int:product_id>', methods=['DELETE'])
# @login_required
# @admin_required
def delete_product(product_id):
    if (utils.delete_product_by_id(product_id)):
        return jsonify({'success': 'True'})
    return jsonify({'success': 'False'})
