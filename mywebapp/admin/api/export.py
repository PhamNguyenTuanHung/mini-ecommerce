import csv
from io import StringIO, BytesIO

import pandas as pd
from flask import request, Response

from mywebapp.admin.api import admin_api


@admin_api.route('/export-users', methods=['POST'])
def export_users():
    users = request.json.get('users', [])
    si = StringIO()
    si.write('\ufeff')
    writer = csv.writer(si)
    writer.writerow(['ID', 'Name', 'Email', 'Role', 'Status', 'Total Orders', 'Phone', 'Join Date', 'Last Active'])
    for u in users:
        writer.writerow([
            str(u.get('id', '')),
            str(u.get('name', '')),
            str(u.get('email', '')),
            str(u.get('role', '')),
            str(u.get('status', '')),
            str(u.get('totalOrders', '')),
            str(u.get('phone', '')),
            str(u.get('joinDate', '')),
            str(u.get('lastActive', ''))
        ])

    output = si.getvalue()
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=users.csv"}
    )


@admin_api.route("/export-products", methods=["POST"])
def export_products():
    data = request.get_json()
    products = data.get("products", [])

    # --- Sheet Products ---
    products_data = []
    for p in products:
        products_data.append({
            "ID": p.get("id"),
            "Name": p.get("name"),
            "Stock": p.get("stock"),
            "TotalSold": p.get("totalSold", 0),
            "Brand": p.get("brand", {}).get("name", ""),
            "Category": p.get("category", {}).get("name", ""),
            "Price": p.get("price", ""),
            "Description": p.get("description", ""),
            "Image": p.get("image", "")
        })
    df_products = pd.DataFrame(products_data)

    # --- Sheet Variants ---
    variants_data = []
    for p in products:
        for v in p.get("variants", []):
            variants_data.append({
                "ProductID": p.get("id"),
                "Color": v.get("color", ""),
                "Size": v.get("size", ""),
                "Price": v.get("price", "")
            })
    df_variants = pd.DataFrame(variants_data)

    # --- Xuất Excel 2 sheet ---
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_products.to_excel(writer, index=False, sheet_name="Products")
        df_variants.to_excel(writer, index=False, sheet_name="Variants")
    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=products_report.xlsx"}
    )


# API xuất báo cáo daonh thu
@admin_api.route("/export-financial", methods=["POST"])
def export_financial():
    revenues = request.json.get('revenues', [])

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Month", "Orders", "Revenue"])
    for r in revenues:
        writer.writerow([r["month"], r["orders"], r["revenue"]])

    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=financial-report.csv"
    return response



@admin_api.route("/export-overview", methods=["POST"])
def export_overview():
    data = request.get_json()
    # Chuẩn bị output CSV
    output = StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Total Users", "New Users (Period)", "Active Users", "Inactive Users", "User Growth",
        "Total Orders", "Orders (Period)", "Pending Orders", "Delivered Orders", "Cancelled Orders", "Order Growth",
        "Total Revenue", "Revenue (Period)", "Revenue Growth",
        "Total Products", "Low Stock Products", "Top Product"
    ])

    # Dòng dữ liệu
    writer.writerow([
        data.get("total_users", 0),
        data.get("new_users_this_period", 0),
        data.get("active_users", 0),
        data.get("inactive_users", 0),
        data.get("user_growth", 0),

        data.get("total_orders", 0),
        data.get("orders_this_period", 0),
        data.get("pending_orders", 0),
        data.get("delivered_orders", 0),
        data.get("cancelled_orders", 0),
        data.get("order_growth", 0),

        data.get("total_revenue", 0),
        data.get("revenue_this_period", 0),
        data.get("revenue_growth", 0),

        data.get("total_products", 0),
        data.get("low_stock_products", 0),
        data.get("top_product", "")
    ])

    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=overview-report.csv"
    return response
