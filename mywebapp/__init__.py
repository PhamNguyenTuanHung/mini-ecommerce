from flask import Flask, request, jsonify, redirect, url_for, session, g
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
import cloudinary


db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sa:123456@BLUE\\BLUE/DBShopQuanAo?driver=ODBC+Driver+17+for+SQL+Server'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = '4205fa3231e2051d51250c956d63c15ad9d47825e1adf2f022cc24acb42c35fc'
    app.config['PAGE_SIZE'] = 6
    cloudinary.config(
            cloud_name= "dmwhvc8tc",
            api_key= "525839167762569",
            api_secret= "LIC1NABexeNrdyL9ect_0gabBcM"
        )

    login.login_view = 'main.login'
    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)
    from mywebapp import models
    @login.user_loader
    def load_user(user_id):
        return models.User.query.get(user_id)

    API_BLUEPRINTS = {'user_api', 'admin_api'}  # tên blueprint API bạn đăng ký

    @login.unauthorized_handler
    def unauthorized_callback():
        if request.blueprint in API_BLUEPRINTS or request.path.startswith('/user/api/'):
            return jsonify({'error': 'Unauthorized'}), 401
        else:
            return redirect(url_for('main.login', next=request.url))

    from mywebapp.user.routes import main
    app.register_blueprint(main)

    from mywebapp.admin.routes import admin
    app.register_blueprint(admin, url_prefix='/admin')

    from mywebapp.admin.api import admin_api
    app.register_blueprint(admin_api)

    from mywebapp.user.api import user_api
    app.register_blueprint(user_api)

    @app.before_request
    def load_admin():
        admin_id = session.get('admin_id')
        if admin_id:
            g.admin = models.Admin.query.get(admin_id)
        else:
            g.admin = None

    return app


