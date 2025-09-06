function createOrderFromCheckout() {
    const productCards = document.querySelectorAll('.product-card');
    const orderDetails = [];

    const rawSubtotal = document.getElementById('subtotal')?.innerText || '0';
    const subtotal = parseFloat(rawSubtotal.replace(/,/g, ''));

    const totalRaw = document.getElementById('total')?.innerText || '0';
    const total_amount = parseFloat(totalRaw.replace(/,/g, ''));

    const discount = subtotal - total_amount;


    const pay_method = document.querySelector('#pay_method').value;

    const voucher_id = document.querySelector("#discount-select").value || null  ;


    let address_id = parseInt(document.querySelector('#saved_address').value);
    if (!address_id) {
        const full_name = document.getElementById('full_name').value;
        const address = document.getElementById('user_address').value;
        const phone = document.getElementById('user_phone').value;

        fetch('/user/api/address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    'name': full_name,
                    'address': address,
                    'phone': phone,
                    'isDefault': false
                }
            )
        }).then(res => res.json()
        ).then(data => {
            if (data.success) {
                address_id = data.address_id
            }
            else {
                Swal.fire("Lỗi","Lõi khi tạo địa chỉ",'error');
                return;
            }
        })
    }


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
        status: 'pending',
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


function changeAddress(select) {
    const selected = select.options[select.selectedIndex];

    if (selected && selected.value !== "") {
        document.getElementById('full_name').value = selected.dataset.name || "";
        document.getElementById('user_address').value = selected.dataset.address || "";
        document.getElementById('user_phone').value = selected.dataset.sdt || "";
    } else {
        document.getElementById('full_name').value = "";
        document.getElementById('user_address').value = "";
        document.getElementById('user_phone').value = "";
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('saved_address');

    if (select) {
        changeAddress(select);
        select.addEventListener('change', function () {
            changeAddress(this);
        });
    }
    const checkboxes = document.querySelectorAll('.checkout-item');

    checkboxes.forEach(cb => {
        const removeId = cb.id.replace('checkout', 'remove');
        const removeLink = document.getElementById(removeId);


        removeLink.style.display = cb.checked ? 'inline' : 'none';


        cb.addEventListener('change', () => {
            removeLink.style.display = cb.checked ? 'inline' : 'none';
        });
    });
});
