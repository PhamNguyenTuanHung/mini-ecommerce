document.addEventListener('alpine:init', () => {
    Alpine.data('flashSaleTable', () => ({
        flashSales: [],
        filteredFlashSales: [],
        selectedFlashSales: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        saleTypeFilter: '',
        statusFilter: '',
        sortField: 'code',
        sortDirection: 'asc',
        isLoading: false,

        init() {
            Alpine.store('flashSaleTableStore', this);
            this.loadFlashSales();
        },

        loadFlashSales() {
            this.isLoading = true;
            fetch('/admin/api/sales', {
                method: 'GET'
            })
                .then(response => response.json())
                .then(data => {
                    this.flashSales = data;
                    console.log(this.flashSales)
                    this.filterFlashSales();
                })
                .catch(error => {
                    console.error('Lỗi khi tải mã giảm giá:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        filterFlashSales() {
            this.filteredFlashSales = this.flashSales.filter(sale => {
                const matchesStatus = !this.statusFilter || sale.status === this.statusFilter;
                return matchesStatus;
            });

            this.sortFlashSales();
            this.currentPage = 1;
        },

        sortFlashSales() {
            this.filteredFlashSales.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];

                if (this.sortField === 'expiry') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else if (this.sortField === 'discount') {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                } else {
                    aVal = aVal?.toString().toLowerCase();
                    bVal = bVal?.toString().toLowerCase();
                }

                if (this.sortDirection === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
        },

        sortBy(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
            this.filterflashSales();
        },

        toggleAll(checked) {
            if (checked) {
                this.selectedflashSales = this.paginatedFlashSales.map(c => c.id);
            } else {
                this.selectedflashSales = [];
            }
        },

        bulkAction(action) {
            if (this.selectedflashSales.length === 0) return;

            const selectedCouponObjects = this.flashSales.filter(c =>
                this.selectedflashSales.includes(c.id)
            );

            switch (action) {
                case 'activate':
                    selectedCouponObjects.forEach(coupon => coupon.status = 'active');
                    this.showNotification('Đã kích hoạt mã giảm giá!', 'success');
                    break;
                case 'deactivate':
                    selectedCouponObjects.forEach(coupon => coupon.status = 'inactive');
                    this.showNotification('Đã ngừng mã giảm giá!', 'info');
                    break;
                case 'delete':
                    if (confirm(`Bạn có chắc muốn xóa ${this.selectedflashSales.length} mã giảm giá?`)) {
                        this.flashSales = this.flashSales.filter(c =>
                            !this.selectedflashSales.includes(c.id)
                        );
                        this.filterflashSales();
                        this.showNotification('Đã xóa mã giảm giá!', 'success');
                    }
                    break;
            }

            this.selectedflashSales = [];
        },

        editSale(sale) {
            const saleForm = Alpine.store('flashSaleFormStore');
            if (saleForm) {
                saleForm.openModal('edit', sale);
            }
        },

        viewCoupon(coupon) {
             const saleForm = Alpine.store('flashSaleFormStore');
            if (saleForm) {
                saleForm.openModal('view', sale);
            }
        },

        // deleteCoupon(coupon) {
        //     Swal.fire({
        //         title: `Bạn có chắc muốn xóa mã "${coupon.code}"?`,
        //         text: "Thao tác này không thể hoàn tác!",
        //         icon: 'warning',
        //         showCancelButton: true,
        //         confirmButtonColor: '#d33',
        //         cancelButtonColor: '#3085d6',
        //         confirmButtonText: 'Xóa',
        //         cancelButtonText: 'Hủy'
        //     }).then(result => {
        //         if (result.isConfirmed) {
        //             fetch(`/admin/api/flashSales/${coupon.id}`, {
        //                 method: "DELETE",
        //                 headers: {
        //                     "Content-Type": "application/json"
        //                 }
        //             })
        //                 .then(res => res.json())
        //                 .then(data => {
        //                     if (data.success) {
        //                         Swal.fire({
        //                             title: "Đã xóa!",
        //                             text: "Mã giảm giá đã được xóa thành công.",
        //                             icon: "success",
        //                             timer: 2000
        //                         });
        //                         this.flashSales = this.flashSales.filter(c => c.id !== coupon.id);
        //                         this.filterflashSales();
        //                     }
        //                 })
        //         }
        //     })
        // },

        // exportflashSales() {
        //     const csvContent = "data:text/csv;charset=utf-8," +
        //         "Code,Type,Value,Expiry,Status\n" +
        //         this.filteredflashSales.map(c =>
        //             `"${c.code}","${c.type}","${c.value}","${c.expiry}","${c.status}"`
        //         ).join("\n");
        //
        //     const encodedUri = encodeURI(csvContent);
        //     const link = document.createElement("a");
        //     link.setAttribute("href", encodedUri);
        //     link.setAttribute("download", "flashSales.csv");
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);
        //
        //     this.showNotification('Xuất file CSV thành công!', 'success');
        // },


        showNotification(message, type = 'info') {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: message,
                    icon: type === 'success' ? 'success' : type === 'error' ? 'error' : 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                alert(message);
            }
        },

        get paginatedFlashSales() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.flashSales.slice(start, end);
        },

        get totalPages() {
            return Math.ceil(this.filteredFlashSales.length / this.itemsPerPage);
        },

        get visiblePages() {
            if (this.totalPages <= 1) return [1];

            const pages = [];
            const delta = 2;
            pages.push(1);

            if (this.totalPages <= 7) {
                for (let i = 2; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (this.currentPage <= 4) {
                    for (let i = 2; i <= 5; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                }
            }

            return pages;
        },

        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        }
    }))
    ;

    Alpine.data('bulkAssignFlashSale', () => ({
        flashSales: [],
        products: [],
        selectedFlashSaleID: null,
        selectedProducts: [],
        isLoading: false,
        currentPage: 1,
        itemsPerPage: 10,

        init() {
            this.loadFlashSales();
            this.loadProducts();
        },

        loadFlashSales() {
            fetch('/admin/api/sales')
                .then(res => res.json())
                .then(data => {
                    this.flashSales = data;
                });
        },

        loadProducts() {
            fetch('/admin/api/products')
                .then(res => res.json())
                .then(data => {
                    this.products = data.products;
                    console.log(data);
                });
        },

        canAssign() {
            return this.selectedFlashSaleID && this.selectedProducts.length > 0;
        },

        toggleAll(checked) {
            if (checked) {
                this.selectedProducts = this.products.map(u => u.id);
            } else {
                this.selectedProducts = [];
            }
        },

        assignSale() {
            if (!this.canAssign()) return;

            this.isLoading = true;

            fetch('/admin/api/sales/assign-bulk', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    product_ids: this.selectedProducts,
                    sale_id: this.selectedFlashSaleID
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: 'Thành công!',
                            text: `Đã gán khuyến mãi cho ${this.selectedProducts.length} sản phẩm.`,
                            icon: 'success',
                            timer: 2000
                        });
                        this.selectedProducts = [];
                        this.selectedFlashSaleID = null;
                    } else {
                        Swal.fire({
                            title: 'Lỗi!',
                            text: data.message || 'Không thể gán mã giảm.',
                            icon: 'error'
                        });
                    }
                })
                .catch(err => console.error(err))
                .finally(() => this.isLoading = false);
        },

        get paginatedProducts() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.products.slice(start, end);
        },

        get totalPages() {
            return Math.ceil(this.products.length / this.itemsPerPage);
        },

        get visiblePages() {
            if (this.totalPages <= 1) return [1];

            const pages = [];
            const delta = 2;
            pages.push(1);

            if (this.totalPages <= 7) {
                for (let i = 2; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (this.currentPage <= 4) {
                    for (let i = 2; i <= 5; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                }
            }

            return pages;
        },


        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                if (this.selectedProducts.length === this.paginatedProducts.length) {
                    this.selectedUserIds = this.paginatedProducts.map(u => u.id);
                }
            }
        }
    }));


    // category form component for modals
    Alpine.data('flashSaleForm', () => ({
        init() {
            Alpine.store('flashSaleFormStore', this);
        },
        mode: null,
        flashSaleID: null,
        form: {
            discount: '',
            start: '',
            end: '',
            name: ''
        },

        openModal(mode, flashSale = null) {
            this.mode = mode;
            this.resetForm();

            if (flashSale) {
                this.flashSaleID = flashSale.id;
                this.form.name = flashSale.name;
                this.form.discount = flashSale.discount;
                this.form.start = flashSale.start;
                this.form.end = flashSale.end;
            }
            const modal = new bootstrap.Modal(document.getElementById('flashSaleModal'));
            modal.show();
        },

        resetForm() {
            this.form = {
                discount: '',
                start: '',
                end: '',
                name: ''
            };
            this.flashSaleID = null;
        },

        isSaleInfoValid() {
            return this.form.name.trim() && this.form.discount.trim() && this.form.start.trim() && this.form.end.trim();
        },

        saveSale() {
            if (!this.isSaleInfoValid()) {
                Swal.fire({
                    title: 'Lỗi',
                    text: 'Vui lòng điền đầy đủ thông tin khuyến mãi',
                    icon: 'warning'
                });
                return;
            }

            const formData = new FormData();
            formData.append('name', this.form.name);
            formData.append('discount', this.form.discount);
            formData.append('start', this.form.start);
            formData.append('end', this.form.end);

            const url = this.mode === 'edit'
                ? `/admin/api/sales/${this.flashSaleID}`
                : `/admin/api/sales`;

            fetch(url, {
                method: "POST",
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: this.mode === 'edit' ? 'Cập nhật khuyến mãi thành công!' : 'Đã thêm khuyến mãi!',
                            icon: 'success'
                        });

                        this.resetForm();

                        const couponTable = Alpine.store('flashSaleTableStore');
                        if (couponTable) {
                            couponTable.loadFlashSales();
                        }
                    } else {
                        Swal.fire({
                            title: 'Lỗi',
                            text: data.message || 'Lưu khuyến mãi thất bại!',
                            icon: 'error'
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                    Swal.fire({
                        title: 'Lỗi hệ thống',
                        text: 'Không thể lưu khuyến mãi. Vui lòng thử lại sau.',
                        icon: 'error'
                    });
                });
        }
    }));


    Alpine.data('searchComponent', () => ({
        query: '',
        results: [],

        search() {
            console.log('Searching for:', this.query);
            this.results = [];
        }
    }));

    // Theme switch component
    Alpine.data('themeSwitch', () => ({
        currentTheme: 'light',

        init() {
            this.currentTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        },

        toggle() {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
            localStorage.setItem('theme', this.currentTheme);
        }
    }));
})
;