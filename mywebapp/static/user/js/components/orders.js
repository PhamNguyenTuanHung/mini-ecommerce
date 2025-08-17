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
                    console.log(this.products)
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
                console.log(123);
                Alpine.store('reviewFormStore', this);
            }
        })
    )
    ;

})
;
Alpine.start();

