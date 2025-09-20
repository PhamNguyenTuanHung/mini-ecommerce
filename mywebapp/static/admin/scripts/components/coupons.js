document.addEventListener('alpine:init', () => {
    Alpine.data('couponTable', () => ({
        coupons: [],
        filteredCoupons: [],
        selectedCoupons: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        discountTypeFilter: '',
        statusFilter: '',
        sortField: 'code',
        sortDirection: 'asc',
        isLoading: false,

        init() {
            Alpine.store('couponTableStore', this);
            this.loadCoupons();
        },

        loadCoupons() {
            this.isLoading = true;
            fetch('/admin/api/coupons', {
                method: 'GET'
            })
                .then(response => response.json())
                .then(data => {
                    this.coupons = data;
                    console.log(data);
                    this.filterCoupons();
                })
                .catch(error => {
                    console.error('Lỗi khi tải mã giảm giá:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        filterCoupons() {
            this.filteredCoupons = this.coupons.filter(coupon => {
                const matchesSearch = !this.searchQuery ||
                    coupon.code.toLowerCase().includes(this.searchQuery.toLowerCase());

                const matchesType = !this.discountTypeFilter || coupon.type === this.discountTypeFilter;

                const matchesStatus = !this.statusFilter || coupon.status === this.statusFilter;

                return matchesSearch && matchesType && matchesStatus;
            });

            this.sortCoupons();
            this.currentPage = 1;
        },

        sortCoupons() {
            this.filteredCoupons.sort((a, b) => {
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
            this.filterCoupons();
        },

        toggleAll(checked) {
            if (checked) {
                this.selectedCoupons = this.paginatedCoupons.map(c => c.id);
            } else {
                this.selectedCoupons = [];
            }
        },

        bulkAction(action) {
            if (this.selectedCoupons.length === 0) return;

            const selectedCouponObjects = this.coupons.filter(c =>
                this.selectedCoupons.includes(c.id)
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
                    if (confirm(`Bạn có chắc muốn xóa ${this.selectedCoupons.length} mã giảm giá?`)) {
                        this.coupons = this.coupons.filter(c =>
                            !this.selectedCoupons.includes(c.id)
                        );
                        this.filterCoupons();
                        this.showNotification('Đã xóa mã giảm giá!', 'success');
                    }
                    break;
            }

            this.selectedCoupons = [];
        },

        editCoupon(coupon) {
            const couponForm = Alpine.store('couponFormStore');
            if (couponForm) {
                couponForm.openModal('edit', coupon);
            }
        },

        viewCoupon(coupon) {
            const couponForm = Alpine.store('couponFormStore');
            if (couponForm) {
                couponForm.openModal('view', coupon);
            }
        },

        deleteCoupon(coupon) {
            Swal.fire({
                title: `Bạn có chắc muốn xóa mã "${coupon.code}"?`,
                text: "Thao tác này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/admin/api/coupons/${coupon.id}`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    title: "Đã xóa!",
                                    text: "Mã giảm giá đã được xóa thành công.",
                                    icon: "success",
                                    timer: 2000
                                });
                                this.coupons = this.coupons.filter(c => c.id !== coupon.id);
                                this.filterCoupons();
                            }
                        })
                }
            })
        },

        exportCoupons() {
            const csvContent = "data:text/csv;charset=utf-8," +
                "Code,Type,Value,Expiry,Status\n" +
                this.filteredCoupons.map(c =>
                    `"${c.code}","${c.type}","${c.value}","${c.expiry}","${c.status}"`
                ).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "coupons.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Xuất file CSV thành công!', 'success');
        },


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

        get paginatedCoupons() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredCoupons.slice(start, end);
        },

        get totalPages() {
            return Math.ceil(this.filteredCoupons.length / this.itemsPerPage);
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

    Alpine.data('bulkAssignVoucher', () => ({
        coupons: [],
        users: [],
        selectedCouponId: null,
        selectedUserIds: [],
        isLoading: false,
        currentPage: 1,
        itemsPerPage: 10,

        init() {
            this.loadCoupons();
            this.loadUsers();
        },

        loadCoupons() {
            fetch('/admin/api/coupons')
                .then(res => res.json())
                .then(data => {
                    this.coupons = data;
                });
        },

        loadUsers() {
            fetch('/admin/api/users')
                .then(res => res.json())
                .then(data => {
                    this.users = data;
                });
        },

        canAssign() {
            return this.selectedCouponId && this.selectedUserIds.length > 0;
        },

        toggleAll(checked) {
            if (checked) {
                this.selectedUserIds = this.users.map(u => u.id);
            } else {
                this.selectedUserIds = [];
            }
        },

        assignVoucher() {
            if (!this.canAssign()) return;

            this.isLoading = true;

            fetch('/admin/api/coupons/assign-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_ids: this.selectedUserIds,
                    coupon_id: this.selectedCouponId
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        title: 'Thành công!',
                        text: `Đã gán voucher cho ${this.selectedUserIds.length} user.`,
                        icon: 'success',
                        timer: 2000
                    });
                    this.selectedUserIds = [];
                    this.selectedCouponId = null;
                } else {
                    Swal.fire({
                        title: 'Lỗi!',
                        text: data.message || 'Không thể gán voucher.',
                        icon: 'error'
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => this.isLoading = false);
        },

        get paginatedUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.users.slice(start, end);
        },

        get totalPages() {
            return Math.ceil(this.users.length / this.itemsPerPage);
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
                if (this.selectedUserIds.length === this.paginatedUsers.length) {
                    this.selectedUserIds = this.paginatedUsers.map(u => u.id);
                }
            }
        }
    }));


    // category form component for modals
    Alpine.data('couponForm', () => ({
        init() {
            Alpine.store('couponFormStore', this);
        },
        mode: null,
        couponId: null,
        form: {
            code: '',
            discount: '',
            expiry_date: '',
            description: '',
        },

        openModal(mode, coupon = null) {
            this.mode = mode;
            this.resetForm();

            if (coupon) {
                this.couponId = coupon.id;
                this.form.code = coupon.code;
                this.form.discount = coupon.discount;
                this.form.expiry_date = coupon.expiry_date.split('T')[0];
                this.form.description = coupon.description;
            }
            const modal = new bootstrap.Modal(document.getElementById('couponModal'));
            modal.show();
        },

        resetForm() {
            this.form = {
                code: '',
                discount: '',
                expiry_date: '',
                description: ''
            };
            this.couponId = null;
        },

        isCouponInfoValid() {
            return this.form.code.trim() && this.form.discount.trim() && this.form.expiry_date.trim();
        },

        saveCoupon() {
            if (!this.isCouponInfoValid()) {
                Swal.fire({
                    title: 'Lỗi',
                    text: 'Vui lòng điền đầy đủ thông tin mã giảm giá',
                    icon: 'warning'
                });
                return;
            }

            const formData = new FormData();
            formData.append('code', this.form.code);
            formData.append('discount', this.form.discount);
            formData.append('expiry_date', this.form.expiry_date);
            formData.append('description', this.form.description);

            const url = this.mode === 'edit'
                ? `/admin/api/coupons/${this.couponId}`
                : `/admin/api/coupons`;

            fetch(url, {
                method: "POST",
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: this.mode === 'edit' ? 'Cập nhật mã giảm giá thành công!' : 'Đã thêm mã giảm giá!',
                            icon: 'success'
                        });

                        this.resetForm();

                        const couponTable = Alpine.store('couponTableStore');
                        if (couponTable) {
                            couponTable.loadCoupons();
                        }
                    } else {
                        Swal.fire({
                            title: 'Lỗi',
                            text: data.message || 'Lưu mã giảm giá thất bại!',
                            icon: 'error'
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                    Swal.fire({
                        title: 'Lỗi hệ thống',
                        text: 'Không thể lưu mã giảm giá. Vui lòng thử lại sau.',
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