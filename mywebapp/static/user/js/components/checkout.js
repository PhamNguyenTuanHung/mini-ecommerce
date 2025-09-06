$(document).ready(function () {
    const baseSubtotal = parseFloat($("#subtotal").text().replace(/,/g, ''));

    $("#discount-select").select2({
        placeholder: "Nhập hoặc chọn voucher...",
        allowClear: true,
        tags: true
    });

    $("#discount-select").on("change", async function () {
        let discountPercent = 0;
        let appliedCode = $(this).val();

        if (appliedCode) {
            const selectedOption = $(this).find("option:selected");
            const percentAttr = selectedOption.data("percent");

            if (percentAttr) {
                discountPercent = parseFloat(percentAttr);
            } else {
                try {
                    const res = await fetch(`/user/api/coupon/${appliedCode}`);
                    const data = await res.json();
                    if (data.error) {
                        showToast("Mã giảm giá không hợp lệ!", 'danger');
                        appliedCode = "";
                    } else {
                        discountPercent = data.percent || 0;
                        appliedCode = data.code;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        }

        let discountAmount = baseSubtotal * (discountPercent / 100);
        let newTotal = baseSubtotal - discountAmount;

        $("#total").text(newTotal.toLocaleString("en-US") + " ₫");

        if (appliedCode) {
            $("#applied-voucher span").text(appliedCode);
            $("#applied-voucher").show();
            $("#applied-voucher").data("id", appliedCode);
        } else {
            $("#applied-voucher").hide();
            $("#applied-voucher").data("id", "");
        }
    });
});

function checkoutSelectedItems() {
    const checkedBoxes = document.querySelectorAll('.checkout-item:checked');
    const selected = Array.from(checkedBoxes).map(cb => cb.value);

    if (selected.length === 0) {
        Swal.fire("Lỗi","Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.",'error');
        return;
    }

    fetch('user/api/checkout/selection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({checkout_items: selected})
    })
        .then(res => {
            if (res.status === 401) {
                window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            return res.json();
        })
        .then(data => {
            if (!data) return;
            if (data.success) {
                window.location.href = "/checkout";
            } else {
                alert("Không thể thực hiện thanh toán.");
            }
        });
}

function createOrderFromCheckout() {
    const productCards = document.querySelectorAll('.product-card');
    const orderDetails = [];

    const rawSubtotal = document.getElementById('subtotal')?.innerText || '0';
    const subtotal = parseFloat(rawSubtotal.replace(/,/g, ''));

    const totalRaw = document.getElementById('total')?.innerText || '0';
    const total_amount = parseFloat(totalRaw.replace(/,/g, ''));

    const discount = subtotal - total_amount;

    const address_id = parseInt(document.querySelector('#saved_address').value);
    const pay_method = document.querySelector('#pay_method').value;

    const discountSelect = document.querySelector("#discount-select");
    const voucher_id = discountSelect.value;


    productCards.forEach(card => {
        orderDetails.push({
            product_id: parseInt(card.dataset.id),
            quantity: parseInt(card.dataset.quantity),
            price: parseFloat(card.dataset.price),
            color: card.dataset.color,
            size: card.dataset.size
        });
    });

    const orderInfo = {
        subtotal: subtotal,
        discount: discount,
        total_amount: total_amount,
        shipping_fee: 0,
        address_id: address_id,
        pay_method: pay_method,
        voucher_id: voucher_id
    };

    const paymentInfo = {
        method: pay_method,
        status: 'Pending',
        payment_date: null
    };

    // COD
    if (pay_method === "COD") {
        fetch('user/api/orders/cod', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                order_info: orderInfo,
                order_details: orderDetails,
                payment_info: paymentInfo
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("Đặt hàng thành công!");
                    window.location.href = "/confirmation";
                } else {
                    showToast(data.message || "Lỗi khi đặt hàng.", "danger");
                }
            });
    }
    // Thanh toán online (MoMo, ZaloPay,...)
    else {
        fetch('user/api/payments/momo/init', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                order_info: orderInfo,
                order_details: orderDetails
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.pay_url) {
                    window.location.href = data.pay_url;
                } else {
                    showToast(data.message || "Không thể tạo đơn hàng.", "danger");
                }
            });
    }
}


function removeFromCheckout(span, key) {
    fetch('/api/checkout-items', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({keys: [key]})
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const productCard = span.closest('.product-card');
                if (productCard) productCard.remove();

                swal.fire("Xóa", "Đã xoá khỏi danh sách thanh toán", "success");
            } else {
                swal.fire("Lỗi", "Không thể xoá sản phẩm khỏi thanh toán", 'error');
            }
        });
}

