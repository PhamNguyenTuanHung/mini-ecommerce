document.addEventListener('alpine:init', () => {
    Alpine.data('brandTable', () => ({
        brands: [],
        filteredBrands: [],
        selectedBrands: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        sortField: 'name',
        sortDirection: 'asc',
        isLoading: false,
        chartsInitialized: false,
        brandColors: {},
        stats: {
            total: 0
        },

        init() {
            Alpine.store('brandTableStore', this);
            this.loadDataBrands();
        },

        loadDataBrands() {
            this.isLoading = true;
            fetch('/admin/api/brands', {method: 'GET'})
                .then(response => response.json())
                .then(data => {
                    this.brands = data;
                    this.filterBrands();
                    console.log(data);
                })
                .catch(error => console.error('Lỗi khi tải thương hiệu:', error))
                .finally(() => this.isLoading = false);
        },


        filterBrands() {
            this.filteredBrands = this.brands.filter(brand => {
                return !this.searchQuery || brand.name.toLowerCase().includes(this.searchQuery.toLowerCase());
            });

            this.sortBrands();
            this.currentPage = 1;
        },

        sortBrands() {
            this.filteredBrands.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];

                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();

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
            this.filterBrands();
        },

        toggleAll(checked) {
            this.selectedBrands = checked ? this.paginatedBrands.map(b => b.id) : [];
        },

        bulkAction(action) {
            if (!this.selectedBrands.length) return;

            const selectedBrandObjects = this.brands.filter(b => this.selectedBrands.includes(b.id));

            switch (action) {
                case 'publish':
                    selectedBrandObjects.forEach(b => b.status = 'published');
                    this.showNotification('Thương hiệu đã được hiển thị!', 'success');
                    break;
                case 'unpublish':
                    selectedBrandObjects.forEach(b => b.status = 'draft');
                    this.showNotification('Thương hiệu đã được ẩn!', 'info');
                    break;
                case 'delete':
                    if (confirm(`Bạn có chắc muốn xóa ${this.selectedBrands.length} thương hiệu?`)) {
                        this.brands = this.brands.filter(b => !this.selectedBrands.includes(b.id));
                        this.filterBrands();
                        this.showNotification('Đã xóa thương hiệu!', 'success');
                    }
                    break;
            }

            this.selectedBrands = [];
        },

        editBrand(brand) {
            const brandForm = Alpine.store('brandFormStore');
            if (brandForm) brandForm.openModal('edit', brand);
        },

        viewBrand(brand) {
            const brandForm = Alpine.store('brandFormStore');
            if (brandForm) brandForm.openModal('view', brand);
        },

        deleteBrand(brand) {
            Swal.fire({
                title: `Bạn có chắc muốn xóa "${brand.name}"?`,
                text: "Thao tác này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/admin/api/brands/${brand.id}`, {
                        method: "DELETE",
                        headers: {"Content-Type": "application/json"}
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    title: "Đã xóa!",
                                    text: "Thương hiệu đã được xóa thành công.",
                                    icon: "success",
                                    timer: 2000
                                });
                                this.brands = this.brands.filter(b => b.id !== brand.id);
                                this.filterBrands();
                            }
                        });
                }
            });
        },

        exportBrands() {
            const csvContent = "data:text/csv;charset=utf-8," +
                "Tên Thương Hiệu,Mô tả,Trạng thái,Ngày tạo\n" +
                this.filteredBrands.map(b =>
                    `"${b.name}","${b.description || ''}","${b.status}","${b.created}"`
                ).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "brands.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Xuất dữ liệu thương hiệu thành công!', 'success');
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

        get paginatedBrands() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            return this.filteredBrands.slice(start, start + this.itemsPerPage);
        },

        get totalPages() {
            return Math.ceil(this.filteredBrands.length / this.itemsPerPage);
        },

        get visiblePages() {
            if (this.totalPages <= 1) return [1];
            const pages = [];
            pages.push(1);
            if (this.totalPages <= 7) {
                for (let i = 2; i <= this.totalPages; i++) pages.push(i);
            } else {
                if (this.currentPage <= 4) {
                    for (let i = 2; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) pages.push(i);
                } else {
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
                    pages.push('...');
                    pages.push(this.totalPages);
                }
            }
            return pages;
        },

        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) this.currentPage = page;
        }
    }));

    Alpine.data('brandForm', () => ({
        init() {
            Alpine.store('brandFormStore', this);
        },
        mode: null,
        brandId: null,
        form: {name: '', description: ''},

        openModal(mode, brand = null) {
            this.mode = mode;
            this.resetForm();
            if (brand) {
                this.brandId = brand.id;
                this.form.name = brand.name;
                this.form.description = brand.description || '';
            }
            const modal = new bootstrap.Modal(document.getElementById('brandModal'));
            modal.show();
        },

        resetForm() {
            this.form = {name: '', description: ''};
            this.brandId = null;
        },

        isBrandInfoValid() {
            return this.form.name.trim();
        },

        saveBrand() {
            if (!this.isBrandInfoValid()) {
                Swal.fire({title: 'Lỗi', text: 'Vui lòng điền tên thương hiệu', icon: 'warning'});
                return;
            }

            const formData = new FormData();
            formData.append('name', this.form.name);
            formData.append('description', this.form.description);

            const url = this.mode === 'edit'
                ? `/admin/api/brands/${this.brandId}`
                : `/admin/api/brands`;

            fetch(url, {method: "POST", body: formData})
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: this.mode === 'edit' ? 'Cập nhật thành công!' : 'Đã thêm thương hiệu!',
                            icon: 'success'
                        });
                        this.resetForm();

                        const brandTable = Alpine.store('brandTableStore');
                        if (brandTable && typeof brandTable.loadDataBrands === 'function') brandTable.loadDataBrands();
                    } else {
                        Swal.fire({title: 'Lỗi', text: data.message || 'Lưu thất bại!', icon: 'error'});
                    }
                })
                .catch(error => {
                    console.error(error);
                    Swal.fire({title: 'Lỗi hệ thống', text: 'Không thể lưu thương hiệu', icon: 'error'});
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