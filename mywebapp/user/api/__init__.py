from flask import Blueprint

user_api = Blueprint('user_api', __name__, url_prefix='/user/api')

from . import products
from . import orders
from . import user_info
from . import carts
from . import checkout
