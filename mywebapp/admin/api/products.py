from cloudinary import uploader
from flask import jsonify, request, json, g
from mywebapp.admin.api import admin_api
from mywebapp import utils
from mywebapp.admin.routes import admin_required



@admin_api.route('/products', methods=['GET'])
@admin_required
def get_all_products():
    products = utils.get_products_full()
    sales_data = utils.get_all_sales()
    return {
        'products': products,
        'sales_data': sales_data
    }

@admin_api.route('/products', methods=['POST'])
@admin_required
def create_product():
    name = request.form.get('name')
    price = request.form.get('price')
    brand = request.form.get('brand')
    category = request.form.get('category')
    description = request.form.get('description')
    sale = request.form.get('sale')
    publish = request.form.get('publish')
    variants = json.loads(request.form.get('variants', '[]'))

    gallery_files = request.files.getlist('gallery_images')
    image_file = request.files.get('image')
    image_url = "https://res.cloudinary.com/dmwhvc8tc/image/upload/v1753408922/product/default.jpg"

    new_product = utils.create_products(name, price, description, category, brand,sale,publish)
    product_id = new_product.MaSanPham

    # Thêm variants
    utils.add_product_variants(product_id, variants)

    utils.admin_log_activity(
        g.admin_id,
        action="create_product",
        message=f"Admin {g.admin_name} tạo sản phẩm {name}, giá={price}"
    )

    # Upload main image
    if image_file and image_file.filename and image_file.mimetype.startswith('image/'):
        try:
            res = uploader.upload(
                image_file,
                folder="products",
                public_id=f"product_{product_id}_main",
                overwrite=True
            )
            image_url = res['secure_url']
        except Exception as e:
            return jsonify({"success": False, "error": f"Lỗi upload ảnh chính: {str(e)}"}), 500

    # Upload gallery
    new_gallery = []
    for idx, gfile in enumerate(gallery_files, start=1):
        if gfile and gfile.filename and gfile.mimetype.startswith('image/'):
            try:
                res = uploader.upload(
                    gfile,
                    folder="products/gallery",
                    public_id=f"product_{product_id}_gallery_{idx}",
                    overwrite=True
                )
                new_gallery.append(res['secure_url'])
            except Exception as e:
                print("Upload gallery error:", e)

    # Thêm gallery vào DB
    if new_gallery:
        utils.add_product_images(product_id, new_gallery)

    # Cập nhật main image
    if image_url:
        utils.update_product_image(product_id, image_url)

    return jsonify({"success": True, "id": product_id, "image_url": image_url})


@admin_api.route('/products/<int:product_id>', methods=['POST'])
@admin_required
def update_product(product_id):
    old_product = utils.get_product_by_id(product_id)
    if not old_product:
        return jsonify({'success': False, 'error': 'Sản phẩm không tồn tại'}), 404

    name = request.form.get('name')
    price = request.form.get('price')
    brand = request.form.get('brand')
    category = request.form.get('category')
    description = request.form.get('description')
    variants = json.loads(request.form.get('variants', '[]'))
    sale = request.form.get('sale')
    publish = request.form.get('publish')


    image_url_form = request.form.get('image_url', '').strip()
    image_file = request.files.get('image')

    # Gallery ảnh phụ
    gallery_files = request.files.getlist("gallery_images")

    new_avatar_url = old_product['image']

    # Nếu có file ảnh upload
    if image_file and image_file.filename and image_file.mimetype.startswith('image/'):
        try:
            res = uploader.upload(
                image_file,
                folder="products",
                public_id=f"product_{product_id}_main",
                overwrite=True
            )
            new_avatar_url = res['secure_url']
        except Exception as e:
            print("Upload error:", e)
            return jsonify({'success': False, 'error': 'Upload ảnh thất bại'}), 400
    elif image_url_form:
        new_avatar_url = image_url_form

    new_gallery = []

    # Upload file gallery
    for idx, gfile in enumerate(gallery_files, start=1):
        if gfile and gfile.filename and gfile.mimetype.startswith('image/'):
            try:
                res = uploader.upload(
                    gfile,
                    folder="products/gallery",
                    public_id=f"product_{product_id}_gallery_{idx}",
                    overwrite=True
                )
                new_gallery.append(res['secure_url'])
            except Exception as e:
                print("Upload gallery error:", e)

    result = utils.update_product(
        product_id=product_id,
        name=name,
        price=price,
        description=description,
        category_id=category,
        brand_id=brand,
        main_img=new_avatar_url,
        variants=variants,
        gallery=new_gallery,
        sale=sale,
        publish=publish
    )

    if result:
        utils.admin_log_activity(
            g.admin_id,
            action="update_product",
            message=f"admin {g.admin_name} cập nhật sản phẩm id={product_id}, name={name}, giá={price}, giảm giá={sale}, hiển thị={publish}"
        )
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Cập nhật thất bại'})


@admin_api.route('/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    if utils.delete_product_by_id(product_id):
        utils.admin_log_activity(
            g.admin_id,
            action="delete_product",
            message=f"admin {g.admin_name} xóa sản phẩm id={product_id}"
        )
        return jsonify({'success': 'True'})
    return jsonify({'success': 'False'})
