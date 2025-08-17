document.addEventListener('alpine:init', () => {
    Alpine.data('categoryTable', () => ({
        categories: [],
        filteredCategories: [],
        selectedCategories: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        categoryFilter: '',
        stockFilter: '',
        sortField: 'name',
        sortDirection: 'asc',
        isLoading: false,
        chartsInitialized: false,
        categoryColors: {},
        stats: {
            total: 0,
            inStock: 0,
            lowStock: 0,
            totalValue: 0
        },

        categoriesStats: [],

        init() {
            Alpine.store('categoryTableStore', this);
            this.loadDataCategories();
            setTimeout(() => {
                this.initCharts();
            }, 500);
        },

        loadDataCategories() {
            this.isLoading = true;
            fetch('/admin/api/categories', {
                method: 'GET'
            })
                .then(response => response.json())
                .then(data => {
                    this.categories = data;
                    data.forEach(cate => {
                        this.categoryColors[cate.name.toLowerCase()] = this.getRandomColor();
                    });
                    this.filterCategories();
                    this.calculateStats();
                    this.initCategoryChart();
                })
                .catch(error => {
                    console.error('Lỗi khi tải danh mục:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        getRandomColor() {
            const hue = Math.floor(Math.random() * 360);
            return `hsl(${hue}, 70%, 70%)`;
        },

        getCategoryColor(category) {
            const key = category.toLowerCase();
            return this.categoryColors[key] || this.getRandomColor();
        }
        ,
        calculateStats() {
            this.stats.total = this.categories.length;
            this.stats.inStock = this.categories.filter(p => p.stock > 20).length;
            this.stats.lowStock = this.categories.filter(p => p.stock > 0 && p.stock <= 20).length;
            this.stats.totalValue = this.categories.reduce((sum, p) => sum + (p.price * p.stock), 0);
            this.categoryStats = this.categories.map(cat => {
                const name = cat.name;
                const count = cat.product_count;
                const color = this.categoryColors?.[name.toLowerCase()] || this.getRandomColor();
                return {
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    count,
                    percentage: Math.round((count / this.categories.length) * 100),
                    color
                };
            });

        }
        ,

        filterCategories() {
            this.filteredCategories = this.categories.filter(category => {
                const matchesSearch = !this.searchQuery ||
                    category.name.toLowerCase().includes(this.searchQuery.toLowerCase())

                const matchesCategory = !this.categoryFilter || category.category.name === this.categoryFilter;
                const matchesStock = !this.stockFilter ||
                    (this.stockFilter === 'in-stock' && category.stock > 20) ||
                    (this.stockFilter === 'low-stock' && category.stock > 0 && category.stock <= 20) ||
                    (this.stockFilter === 'out-of-stock' && category.stock === 0);

                return matchesSearch && matchesCategory && matchesStock;
            });

            this.sortCategories();
            this.currentPage = 1;
        }
        ,

        sortCategories() {
            this.filteredCategories.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];

                if (this.sortField === 'stock') {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                } else if (this.sortField === 'created') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else {
                    aVal = aVal.toString().toLowerCase();
                    bVal = bVal.toString().toLowerCase();
                }

                if (this.sortDirection === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
        }
        ,

        sortBy(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
            this.filterCategories();
        }
        ,

        toggleAll(checked) {
            if (checked) {
                this.selectedCategories = this.paginatedCategories.map(p => p.id);
            } else {
                this.selectedCategories = [];
            }
        }
        ,

        bulkAction(action) {
            if (this.selectedCategories.length === 0) return;

            const selectedcategoryObjects = this.Categories.filter(p =>
                this.selectedCategories.includes(p.id)
            );

            switch (action) {
                case 'publish':
                    selectedcategoryObjects.forEach(category => {
                        category.status = 'published';
                    });
                    this.showNotification('categories published successfully!', 'success');
                    break;
                case 'unpublish':
                    selectedcategoryObjects.forEach(category => {
                        category.status = 'draft';
                    });
                    this.showNotification('categories unpublished successfully!', 'info');
                    break;
                case 'delete':
                    if (confirm(`Are you sure you want to delete ${this.selectedCategories.length} category(s)?`)) {
                        this.categories = this.categories.filter(p =>
                            !this.selectedCategories.includes(p.id)
                        );
                        this.filterCategories();
                        this.calculateStats();
                        this.showNotification('categories deleted successfully!', 'success');
                    }
                    break;
            }

            this.selectedCategories = [];
            this.calculateStats();

        }
        ,

        editCategory(category) {
            const categoryForm = Alpine.store('categoryFormStore');
            if (categoryForm) {
                categoryForm.openModal('edit', category);
            }
        },

        viewCategory(category) {
            const categoryForm = Alpine.store('categoryFormStore');
            if (categoryForm) {
                categoryForm.openModal('view', category);
            }
        }
        ,

        deleteCategory(category) {
            Swal.fire({
                title: `Bạn có chắc muốn xóa "${category.name}"?`,
                text: "Thao tác này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy'
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/admin/api/categories/${category.id}`, {
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
                                    text: "Sản phẩm đã được xóa thành công.",
                                    icon: "success",
                                    timer: 2000
                                });
                                this.categories = this.categories.filter(p => p.id !== category.id);
                                this.filterCategories();
                                this.calculateStats();
                            }
                        })
                }
            })
        }
        ,

        exportCategories() {
            const csvContent = "data:text/csv;charset=utf-8," +
                "Name,SKU,Category,Price,Stock,Status,Created\n" +
                this.filteredCategories.map(p =>
                    `"${p.name}","${p.sku}","${p.category}","${p.price}","${p.stock}","${p.status}","${p.created}"`
                ).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "categories.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('categories exported successfully!', 'success');
        }
        ,

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
        }
        ,

        initCharts() {
            // Prevent multiple chart initializations
            if (this.chartsInitialized) return;
            this.initCategoryChart();
            this.chartsInitialized = true;
        }
        ,


        initCategoryChart() {
            const categoryChart = document.getElementById('categoryChart');
            if (!categoryChart) {
                console.warn('Category chart element not found');
                return;
            }
            categoryChart.innerHTML = '';

            try {

                const chartData = {
                    series: this.categoriesStats.map(cat => cat.count),
                    chart: {
                        type: 'donut',
                        height: 200
                    },
                    labels: this.categoriesStats.map(cat => cat.name),
                    colors: this.categoriesStats.map(cat => cat.color),
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '70%'
                            }
                        }
                    },
                    legend: {
                        show: false
                    },
                    tooltip: {
                        y: {
                            formatter: function (val) {
                                return val + " categories"
                            }
                        }
                    }
                };

                const chart = new ApexCharts(categoryChart, chartData);
                chart.render();
            } catch (error) {
                console.error('Error rendering category chart:', error);
            }
        }
        ,

        get paginatedCategories() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredCategories.slice(start, end);
        }
        ,

        get totalPages() {
            return Math.ceil(this.filteredCategories.length / this.itemsPerPage);
        }
        ,

        get visiblePages() {
            if (this.totalPages <= 1) return [1];

            const pages = [];
            const delta = 2;

            // Always show first page
            pages.push(1);

            if (this.totalPages <= 7) {
                // If total pages is small, show all
                for (let i = 2; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Complex pagination logic
                if (this.currentPage <= 4) {
                    // Near the beginning
                    for (let i = 2; i <= 5; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                } else if (this.currentPage >= this.totalPages - 3) {
                    // Near the end
                    pages.push('...');
                    for (let i = this.totalPages - 4; i <= this.totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    // In the middle
                    pages.push('...');
                    for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                        pages.push(i);
                    }
                    pages.push('...');
                    pages.push(this.totalPages);
                }
            }

            return pages;
        }
        ,

        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        }
    }))
    ;


    // category form component for modals
    Alpine.data('categoryForm', () => ({
        init() {
            Alpine.store('categoryFormStore', this);
        },
        mode: null,
        categoryId: null,
        form: {
            name: '',
        },

        openModal(mode, category = null) {
            this.mode = mode;
            this.resetForm();

            if (category) {
                this.categoryId = category.id;
                this.form.name = category.name;
            }
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();
        }
        ,

        resetForm() {
            this.form = {
                name: ''
            };
            this.categoryId = null;
        }
        ,


        isCategoryInfoValid() {
            return this.form.name.trim()
        }
        ,

        saveCategory() {
            if (!this.isCategoryInfoValid()) {
                Swal.fire({
                    title: 'Lỗi',
                    text: 'Vui lòng điền đầy đủ thông tin bắt buộc ',
                    icon: 'warning'
                });
                return;
            }

            const formData = new FormData();
            formData.append('name', this.form.name);

            const url = this.editMode
                ? `/admin/api/categories/${this.categoryId}`
                : `/admin/api/categories`;

            fetch(url, {
                method: "POST",
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: this.editMode ? 'Cập nhật thành công!' : 'Đã thêm danh mục!',
                            icon: 'success'
                        });

                        this.resetForm();

                        const categoryTable = Alpine.store('categoryTableStore');
                        if (categoryTable && typeof categoryTable.loadDataCategories === 'function') {
                            categoryTable.loadDataCategories();
                        }
                    } else {
                        Swal.fire({
                            title: 'Lỗi',
                            text: data.message || 'Lưu sản phẩm thất bại!',
                            icon: 'error'
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                    Swal.fire({
                        title: 'Lỗi hệ thống',
                        text: 'Không thể lưu sản phẩm. Vui lòng thử lại sau.',
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