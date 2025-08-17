# user/api/products.py
import uuid
from datetime import datetime
from flask import jsonify, request, session, url_for
from flask_login import login_required, current_user
from mywebapp.user.api import user_api
from mywebapp import utils


@user_api.route('/products', methods=['GET'])
def get_products():
    products = utils.get_products()
    return jsonify(products)


@user_api.route('products/stock', methods=['GET'])
def get_product_stock():
    product_id = request.args.get('product_id')
    color = request.args.get('color')
    size = request.args.get('size')

    quantity = utils.count_stock_product(product_id=product_id, size=size, color=color)
    return jsonify({'quantity': quantity})


@user_api.route('/categories', methods=['GET'])
def get_categories():
    categories = utils.get_categories()
    return categories


@user_api.route('/brands', methods=['GET'])
def get_brands():
    brands = utils.get_brands()
    return jsonify([
        {'name': b.TenThuongHieu, 'id': b.MaThuongHieu} for b in brands
    ])

