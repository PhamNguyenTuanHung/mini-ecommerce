//Address

function updateAddress() {
    const row = $(this).closest('tr');
    const id = row.data('id');
    const ten = row.find('.input-ten').val();
    const diachi = row.find('.input-diachi').val();
    const sdt = row.find('.input-sdt').val();
    const mac_dinh = row.find('.input-macdinh').is(':checked');

    fetch('/user/api/address', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'id': id,
            'ho_ten': ten,
            'dia_chi': diachi,
            'sdt': sdt,
            'mac_dinh': mac_dinh
        })
    }).then(res => res.json())
        .then(data => {
            if (data.success) {
                row.find('td:eq(0) .view-mode').text(ten);
                row.find('td:eq(1) .view-mode').text(diachi);
                row.find('td:eq(2) .view-mode').text(sdt);
                row.find('.edit-mode').addClass('d-none');
                row.find('.view-mode').removeClass('d-none');
                row.find('.input-macdinh').prop('disabled', true);

                Swal.fire('Cập nhật thành công!', '', 'success');
            } else {
                Swal.fire('Lỗi khi cập nhật!', '', 'error');
            }
        });
}

function deleteAddress() {
    const row = $(this).closest('tr');
    const id = row.data('id');

    Swal.fire({
        title: 'Bạn có chắc muốn xóa?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/user/api/address/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        row.remove();
                        Swal.fire('Đã xóa!', '', 'success');
                    } else {
                        Swal.fire('Xóa thất bại!', '', 'error');
                    }
                })
                .catch(() => {
                    Swal.fire('Lỗi kết nối server!', '', 'error');
                });
        }
    });
}

function addAddress(name, address, phone, isDefault) {
    fetch('/user/api/address', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(
            {
                'name': name,
                'address': address,
                'phone': phone,
                'isDefault': isDefault
            }
        )
    }).then(res => res.json()
    ).then(data => {
        if (data.success) {
            Swal.fire('Thêm thành công!', '', 'success');

            // Thêm dòng vào table
            const tableBody = document.querySelector('table tbody');
            const newRow = document.createElement('tr');
            newRow.setAttribute('data-id', data.address_id);

            newRow.innerHTML = `
                <td>
                    <div class="view-mode">${name}</div>
                    <div class="edit-mode d-none">
                        <input type="text" class="form-control input-ten" value="${name}">
                    </div>
                </td>
                <td>
                    <div class="view-mode">${address}</div>
                    <div class="edit-mode d-none">
                        <input type="text" class="form-control input-diachi" value="${address}">
                    </div>
                </td>
                <td>
                    <div class="view-mode">${phone}</div>
                    <div class="edit-mode d-none">
                        <input type="text" class="form-control input-sdt" value="${phone}">
                    </div>
                </td>
                <td class="radio-cell">
                    <input type="radio" class="input-macdinh" name="macdinh" ${isDefault ? 'checked' : ''} disabled>
                </td>
                <td>
                    <div class="view-mode">
                        <button class="btn btn-sm btn-warning btn-edit">Sửa</button>
                        <button class="btn btn-sm btn-danger btn-delete">Xóa</button>
                    </div>
                    <div class="edit-mode d-none">
                        <button class="btn btn-sm btn-success btn-save">Lưu</button>
                        <button class="btn btn-sm btn-secondary btn-cancel">Hủy</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(newRow);

            // Reset form
            $('#add-ten, #add-diachi, #add-sdt').val('');
            $('#add-macdinh').prop('checked', false);
            $('#add-address-form').addClass('d-none');
            $('#btn-add').removeClass('d-none');
        } else {
            Swal.fire('Thêm thất bại!', '', 'error');
        }
    });
}

$(document).ready(function () {
    $('.btn-edit').click(function () {
        const row = $(this).closest('tr');
        row.find('.view-mode').addClass('d-none');
        row.find('.edit-mode').removeClass('d-none');
        row.find('.input-macdinh').prop('disabled', false);
    });

    // Bấm nút Hủy: quay về view-mode
    $('.btn-cancel').click(function () {
        const row = $(this).closest('tr');
        row.find('.edit-mode').addClass('d-none');
        row.find('.view-mode').removeClass('d-none');
        row.find('.input-macdinh').prop('disabled', true);
    });

    // Bấm Lưu: gửi API, cập nhật view-mode
    $('.btn-save').click(function () {
        updateAddress.call(this); // this chính là nút .btn-save
    });

    $('.btn-delete').click(function () {
        deleteAddress.call(this); // this chính là nút .btn-save
    });

    $('#btn-add').click(function () {
        $('#add-address-form').removeClass('d-none');
        $(this).addClass('d-none'); // ẩn nút
    });

    $('#btn-cancel-add').click(function () {
        $('#add-address-form').addClass('d-none');
        $('#btn-add').removeClass('d-none');
        $('#add-address-form input').val('');
    });

    $('#btn-submit-add').click(function () {
        const name = $('#add-ten').val();
        const address = $('#add-diachi').val();
        const phone = $('#add-sdt').val();
        const isDefault = $('#add-macdinh').is(':checked');

        if (!name || !address || !phone) {
            showToast("Vui lòng điền đầy đủ thông tin!", "warning");
            return;
        }

        addAddress(name, address, phone, isDefault);
    });

});


//User


function startEdit() {
    document.getElementById("info-view").style.display = "none";
    document.getElementById("info-form").style.display = "block";
    document.getElementById("edit-btn").style.display = "none";
    document.getElementById("avatar-input").style.display = "block";
}

function cancelEdit() {
    document.getElementById("info-view").style.display = "block";
    document.getElementById("info-form").style.display = "none";
    document.getElementById("edit-btn").style.display = "inline-block";
    document.getElementById("avatar-input").style.display = "none";
}

document.addEventListener('DOMContentLoaded', function () {
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('avatar-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function updateUserProfile() {
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);

    const avatarFile = document.getElementById('avatar-input').files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    fetch('/api/user/profile', {
        method: 'POST',
        body: formData
    }).then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log("Avatar trả về từ server:", data.avatar);

                // Cập nhật UI
                document.querySelector('span.user_fullname').textContent = data.name;
                document.querySelector('span.user_email').textContent = data.email;
                document.querySelector('span.user_phone').textContent = data.phone;
                if (data.avatar) {
                    const timestamp = new Date().getTime();
                    const newUrl = data.avatar.includes('?')
                        ? `${data.avatar}&t=${timestamp}`
                        : `${data.avatar}?t=${timestamp}`;
                    document.getElementById('avatar-preview').src = newUrl;
                }


                showToast("Cập nhật thành công", "success");
                cancelEdit(); // Ẩn form
            } else {
                showToast(data.error || "Cập nhật thất bại", "danger");
            }
        }).catch(err => {
        showToast("Lỗi kết nối", "danger");
    });
}


// đổi mật khẩu
function changePassword() {
    const form = document.getElementById("changePasswordForm");
    const formData = new FormData(form);

    fetch('/user/api/change-password', {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, "success");
            form.reset();
        } else {
            showToast(data.error, "danger");
        }
    })
    .catch(err => {
        console.error("Error:", err);
        showToast("Có lỗi xảy ra khi đổi mật khẩu", "danger");
    });
}



function togglePassword(fieldId, el) {
    var input = document.getElementById(fieldId);
    var icon = el.querySelector("i");

    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fa fa-eye";
    }
}

import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

window.Alpine = Alpine;

document.addEventListener('alpine:init', () => {
    Alpine.data('orderTable', () => ({
        orders: [],
        filteredOrders: [],
        currentPage: 1,
        itemsPerPage: 10,


        statusStats: [],
        init() {
            this.loadDataOrders();
        },

        loadDataOrders() {
            this.loading = true;
            fetch('/user/api/orders', {
                method: "GET"
            })
                .then(res => res.json())
                .then(data => {
                    this.orders = data
                })
                .catch(error => {
                    console.error('Lỗi khi load đơn hàng:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        cancelOrder(order_id) {
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
                if (result.isConfirmed) {
                    fetch(`/user/api/orders/${order_id}`, {
                        method: 'POST',
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                showToast("Hủy đơn hàng thành công", "success");
                            } else {
                                showToast("Hủy đơn hàng thất bại", "danger");
                            }
                        })
                }
            });
        },

        // load(id) {
        //     const userForm = Alpine.store('reviewFormStore');
        //     if (userForm) {
        //         userForm.load(id);
        //         // Đợi Alpine render xong nội dung
        //         setTimeout(() => {
        //             const modal = new bootstrap.Modal(document.getElementById('reviewModal'), {
        //                 backdrop: 'static'
        //             });
        //             modal.show();
        //         }, 200);
        //     }
        // },
        openReviewModal(order) {
            const reviewForm = Alpine.store('reviewFormStore');
            if (!reviewForm) return;

            reviewForm.load(order.id);

            $('#reviewModal').modal('show');
        },


        get paginatedOrders() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredOrders.slice(start, end);
        }
        ,

        get totalPages() {
            return Math.ceil(this.filteredOrders.length / this.itemsPerPage);
        }
        ,

        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        }
    }));

    Alpine.data('reviewForm', () => ({
            products: [],
            loading: false,
            orderId: null,

            async load(orderId) {
                this.orderId = orderId;
                this.loading = true;
                this.products = [];
                try {
                    const res = await fetch(`/user/api/orders/${orderId}/products`);
                    const data = await res.json();
                    this.products = data;
                } catch (err) {
                    console.error("Lỗi tải sản phẩm:", err);
                } finally {
                    this.loading = false;
                }
            },

            submitReview(product) {
                fetch('/user/api/reviews', {
                    method: "POST",
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        'product_id': product.id,
                        'rating': product.rating,
                        'comment': product.comment
                    })
                }).then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire("Cập nhật đánh giá thành công", "", "success");
                        } else {
                            Swal.fire("Cập nhật đánh giá thất bại", "", "error");
                        }
                    })
            },

            init() {
                Alpine.store('reviewFormStore', this);
            }
        })
    )
    ;
})
;
Alpine.start();


