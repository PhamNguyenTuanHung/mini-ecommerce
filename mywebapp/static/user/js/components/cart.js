availableStock = window.availableStock;

function addToCart() {
    event?.preventDefault();

    let input = document.getElementById('product-quantity-' + productFromServer.id);
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
            id: productFromServer.id,
            quantity: quantity,
            name: productFromServer.name,
            price: productFromServer.price,
            color: color,
            size: size,
            image:productFromServer.image
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
            if (!data.success) {
                // Xử lý lỗi từ backend (ví dụ: hết hàng)
                swal.fire("Lỗi", data.message || "Không thể cập nhật giỏ hàng", "error");
                // đồng bộ lại input về số lượng cũ
                if (input) {
                    input.value = input.dataset.prevQuantity || 1;
                }
                return;
            }

            // ✅ Cập nhật số lượng cũ để rollback nếu có lỗi lần sau
            input.dataset.prevQuantity = quantity;

            // ✅ Update các phần tử liên quan
            const totalElem = document.getElementById('cart-total');
            document.getElementById(`item-total-${product_id}`).innerText = data.item_total;
            document.getElementById("cart_count_id").innerText = data.total_quantity;

            if (totalElem && data.total_amount !== undefined) {
                totalElem.innerText = data.total_amount;
            }

            const dropdown = document.querySelector('.dropdown-menu.cart-dropdown');
            if (dropdown && data.mini_cart_html) {
                dropdown.innerHTML = data.mini_cart_html;
            }
        })
        .catch(err => {
            console.error(err);
            swal.fire("Lỗi", "Có lỗi khi cập nhật giỏ hàng", "error");
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

























