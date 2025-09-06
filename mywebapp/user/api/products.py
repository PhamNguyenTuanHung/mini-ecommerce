# user/api/products.py

from flask import jsonify, request
from mywebapp.user.api import user_api
from mywebapp import utils


@user_api.route('/products', methods=['GET'])
def get_products():
    cate_id = request.args.get("cate_id")
    brand_id = request.args.get("brand_id")
    kw = request.args.get("kw")
    page = request.args.get("page", default=1, type=int)
    sort_by = request.args.get("sort_by")

    data = utils.load_products(
        cate_id=cate_id,
        brand_id=brand_id,
        kw=kw,
        page=page,
        sort_by=sort_by
    )
    return jsonify(data)


@user_api.route('/products/best-sellers')
def get_best_sellers():
    products = utils.get_best_sellers()
    return jsonify(products)


@user_api.route('/products/newest')
def get_newest():
    products = utils.get_newest_products()
    return jsonify(products)

@user_api.route('/products/best-rated')
def get_best_rated():
    products = utils.get_best_rated()
    return jsonify(products)


@user_api.route('products/stock', methods=['GET'])
def get_product_stock():
    product_id = request.args.get('product_id')
    color = request.args.get('color')
    size = request.args.get('size')

    stock  = utils.count_stock_product(product_id=product_id, size=size, color=color)
    return stock


@user_api.route('/categories', methods=['GET'])
def get_categories():
    categories = utils.get_categories()
    return categories


@user_api.route('/brands', methods=['GET'])
def get_brands():
    brands = utils.get_brands()
    return brands
