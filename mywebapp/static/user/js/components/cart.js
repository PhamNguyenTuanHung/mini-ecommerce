availableStock = window.availableStock

function addToCart(id, name, price, color, size,image) {
    event?.preventDefault();

    let input = document.getElementById('product-quantity-' + id);
    const quantity = input ? parseInt(input.value) || 1 : 1;

    if (isNaN(quantity) || quantity <= 0) {
        showToast("Vui lòng nhập số lượng hợp lệ!");
        return;
    }

    if (typeof availableStock !== "undefined" && quantity > availableStock) {
        showToast(`Chỉ còn lại ${availableStock} sản phẩm trong kho!`, 'danger');
        return;
    }

    fetch('/user/api/cart', {
        method: 'POST',
        body: JSON.stringify({
            id: id,
            quantity: quantity,
            name: name,
            price: price,
            color: color,
            size: size,
            image:image
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            showToast("Thêm vào giỏ hàng thành công", 'success');
            const badge = document.getElementById("cart_count_id");
            if (badge) {
                badge.innerText = data.total_quantity;
                badge.classList.toggle("d-none", data.total_quantity === 0);
            }
            const dropdown = document.querySelector('.dropdown-menu.cart-dropdown');
            if (dropdown && data.mini_cart_html) {
                dropdown.innerHTML = data.mini_cart_html;
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Lỗi khi thêm giỏ hàng: ' + (err?.message || 'Không rõ lỗi'), 'danger');
        });
}


function removeCartItem(product_id, color, size) {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: "Bạn có muốn xóa sản phẩm này khỏi giỏ hàng không?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        customClass: {
            popup: 'swal2-small'
        }
    }).then((result) => {
        if (!result.isConfirmed) return;

        let key = `${product_id}_${size}_${color}`;

        fetch(`/user/api/cart/${key}`, {
            method: 'DELETE',
            body: JSON.stringify({}),
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Xóa dòng sản phẩm khỏi bảng
                    const row = document.querySelector(`tr[data-id="${product_id}"]`);
                    if (row) row.remove();

                    // Cập nhật tổng tiền
                    const totalElem = document.getElementById('cart-total');
                    if (totalElem && data.total_amount !== undefined) {
                        totalElem.innerText = data.total_amount;
                    }

                    // Cập nhật số lượng trong giỏ
                    const cartCountElem = document.getElementById("cart_count_id");
                    if (cartCountElem) {
                        cartCountElem.innerText = data.total_quantity;
                    }

                    // Cập nhật mini-cart dropdown nếu có
                    const dropdown = document.querySelector('.dropdown-menu.cart-dropdown');
                    if (dropdown && data.mini_cart_html) {
                        dropdown.innerHTML = data.mini_cart_html;
                    }

                    showToast("Xóa thành công");
                } else {
                    Swal.fire("Không thể xóa!", "Đã xảy ra lỗi.", "error");
                }
            })
            .catch(() => {
                Swal.fire("Lỗi server!", "Vui lòng thử lại sau.", "error");
            });
    });
}


function updateQuantityCartItem(id, quantity) {

    var input = document.querySelector(`input[data-id="${id}"]`);
    var size = input.dataset.size;
    var color = input.dataset.color;
    var product_id = input.dataset.productId;

    let key = `${product_id}_${size}_${color}`;

    fetch(`/user/api/cart/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({
            'quantity': quantity
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const totalElem = document.getElementById('cart-total');
                document.getElementById(`item-total-${product_id}`).innerText = data.item_total.toLocaleString();
                document.getElementById("cart_count_id").innerText = data.total_quantity

                if (totalElem && data.total_amount !== undefined) {
                    totalElem.innerText = data.total_amount;
                }

                const dropdown = document.querySelector('.dropdown-menu.cart-dropdown');
                if (dropdown && data.mini_cart_html) {
                    dropdown.innerHTML = data.mini_cart_html;
                }
            }
        });
}


$(document).on('click', '.bootstrap-touchspin-up, .bootstrap-touchspin-down', function () {

    const $input = $(this).closest('.bootstrap-touchspin').find('input.cart-product-quantity');

    if ($input.length === 0) return; //

    const id = $input.data('id');
    setTimeout(() => {

        const quantity = parseInt($input.val()) || 0;

        if (quantity === 0) {
            removeCartItem(id);
        } else {
            updateQuantityCartItem(id, quantity);
        }
    }, 50);
});

// CheckOUt

function checkoutSelectedItems() {
    const checkedBoxes = document.querySelectorAll('.checkout-item:checked');
    const selected = Array.from(checkedBoxes).map(cb => cb.value);

    if (selected.length === 0) {
        alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
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

                // (Tuỳ bạn: nếu muốn cập nhật lại tổng tiền thì xử lý tiếp)

                showToast("Đã xoá khỏi danh sách thanh toán");
            } else {
                alert("Không thể xoá sản phẩm khỏi thanh toán");
            }
        });
}

function createOrderFromCheckout() {
    const productCards = document.querySelectorAll('.product-card');
    const orderDetails = [];


    const rawSubtotal = document.getElementById('subtotal')?.innerText || '0';
    const cleaned = rawSubtotal.replace(/,/g, '');
    const subtotal = parseFloat(cleaned);
    const address_id = parseInt(document.querySelector('#saved_address').value);
    const pay_method = document.querySelector('#pay_method').value;

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
        total_amount: subtotal,
        shipping_fee: 0,
        discount: 0,
        address_id: address_id,
        pay_method: pay_method
    };

    const paymentInfo = {
        method: pay_method,
        status: 'Pending',
        payment_date: null
    };
    // Thanh toán tiền mặt
    if (pay_method == "COD") {
        fetch('user/api/orders/cod', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
                    showToast("Lỗi khi đặt hàng.", "danger");
                }
            });
    }

    // Nếu là thanh toán online (MOMO, ZaloPay,...)
    else {
        fetch('user/api/payments/momo/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_info: orderInfo,
                order_details: orderDetails
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.pay_url)
                        window.location.href = data.pay_url;
                    else {
                        showToast("Không thể tạo đơn hàng.", "danger");
                    }
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
});





// Order





















