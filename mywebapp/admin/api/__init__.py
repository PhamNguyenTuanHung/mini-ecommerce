
from flask import Blueprint

admin_api = Blueprint('admin_api', __name__, url_prefix='/admin/api')


from . import products
from . import orders
from . import users
from . import categories
from . import export
from . import coupons
from . import brands


