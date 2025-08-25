document.addEventListener('alpine:init', () => {
    Alpine.data('productTable', () => ({
            products: [],
            filteredProducts: [],
            selectedProducts: [],
            categories: [],
            currentPage: 1,
            itemsPerPage: 10,
            searchQuery: '',
            categoryFilter: '',
            brandFilter: '',
            stockFilter: '',
            sortField: 'name',
            sortDirection: 'asc',
            isLoading: false,
            chartsInitialized: false,
            categoryColors: {},
            salesData: [],
            // Statistics
            stats: {
                total: 0,
                inStock: 0,
                lowStock: 0,
                totalValue: 0
            },
            categoryStats: [],
            topSellersChart: null,
            topSellerData: [],

            init() {
                Alpine.store('productTableStore', this);
                this.loadDataProducts();
                this.loadCategories();
                this.initInteractiveElements();
            },

            loadDataProducts() {
                this.isLoading = true;
                fetch('/admin/api/products', {
                    method: 'GET'
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log(123);
                        this.products = data.products;
                        this.salesData = data.sales_data;
                        this.topSellerData = this.getTopSellers(7);
                        this.filterProducts();
                        this.calculateStats();
                        this.initCharts();

                    })
                    .catch(error => {
                        console.error('Lỗi khi load sản phẩm:', error);
                    })
                    .finally(() => {
                        this.isLoading = false;
                    });
            },

            getRandomColor() {
                const hue = Math.floor(Math.random() * 360);
                return `hsl(${hue}, 70%, 70%)`;
            },

            loadCategories() {
                fetch('/admin/api/categories', {
                        method: 'GET'
                    }
                ).then(res => res.json()
                ).then(data => {
                    data.forEach(cate => {
                        this.categoryColors[cate.name.toLowerCase()] = this.getRandomColor();
                    });
                    this.calculateStats();
                })
                    .catch(err => {
                        console.error('Lỗi khi load danh mục:', err);
                    });
            },

            getTopSellers(daysCount = 7) {
                const today = new Date();
                let filteredSales = [];

                if (daysCount === 365) {
                    filteredSales = this.salesData.filter(sale => {
                        const d = new Date(sale.date);
                        return !isNaN(d) && d.getFullYear() === today.getFullYear();
                    });
                } else {
                    const startDate = new Date(today);
                    startDate.setDate(today.getDate() - (daysCount - 1));
                    filteredSales = this.salesData.filter(sale => {
                        const d = new Date(sale.date);
                        return !isNaN(d) && d >= startDate && d <= today;
                    });
                }

                const count = {};
                filteredSales.forEach(sale => {
                    count[sale.product_id] = (count[sale.product_id] || 0) + sale.quantity;
                });

                return Object.entries(count)
                    .map(([id, total]) => {
                        const product = this.products.find(p => p.id === Number(id));
                        return {
                            product_id: Number(id),
                            product_name: product ? product.name : 'Unknown',
                            totalSold: total
                        };
                    })
                    .sort((a, b) => b.totalSold - a.totalSold);
            }
            ,

            getCategoryColor(category) {
                const key = category.toLowerCase();
                return this.categoryColors[key] || this.getRandomColor();
            }
            ,
            calculateStats() {

                this.stats.total = this.products.length;
                this.stats.inStock = this.products.filter(p => p.stock > 20).length;
                this.stats.lowStock = this.products.filter(p => p.stock > 0 && p.stock <= 20).length;
                this.stats.totalValue = this.products.reduce((sum, p) => sum + (p.price * p.stock), 0);

                const categories = {};
                this.products.forEach(product => {
                    categories[product.category.name] = (categories[product.category.name] || 0) + 1;
                });

                this.categoryStats = Object.entries(categories).map(([name, count]) => {
                    const color = this.categoryColors?.[name.toLowerCase()] || this.getRandomColor();
                    return {
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        count,
                        percentage: Math.round((count / this.products.length) * 100),
                        color
                    };
                });
            }
            ,

            filterProducts() {
                this.filteredProducts = this.products.filter(product => {
                    const matchesSearch = !this.searchQuery ||
                        product.name.toLowerCase().includes(this.searchQuery.toLowerCase())

                    const matchesCategory = !this.categoryFilter || product.category.name === this.categoryFilter;
                    const matchesBrand = !this.brandFilter || product.brand.name === this.brandFilter;

                    const matchesStock = !this.stockFilter ||
                        (this.stockFilter === 'in-stock' && product.stock > 20) ||
                        (this.stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 20) ||
                        (this.stockFilter === 'out-of-stock' && product.stock === 0);

                    return matchesSearch && matchesCategory && matchesStock && matchesBrand;
                });

                this.sortProducts();
                this.currentPage = 1;
            }
            ,

            sortProducts() {
                this.filteredProducts.sort((a, b) => {
                    let aVal = a[this.sortField];
                    let bVal = b[this.sortField];

                    if (this.sortField === 'price' || this.sortField === 'stock') {
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
                this.filterProducts();
            }
            ,


            toggleAll(checked) {
                if (checked) {
                    this.selectedProducts = this.paginatedProducts.map(p => p.id);
                } else {
                    this.selectedProducts = [];
                }
            }
            ,

            bulkAction(action) {
                if (this.selectedProducts.length === 0) return;

                const selectedProductObjects = this.products.filter(p =>
                    this.selectedProducts.includes(p.id)
                );

                switch (action) {
                    case 'publish':
                        selectedProductObjects.forEach(product => {
                            product.status = 'published';
                        });
                        this.showNotification('Products published successfully!', 'success');
                        break;
                    case 'unpublish':
                        selectedProductObjects.forEach(product => {
                            product.status = 'draft';
                        });
                        this.showNotification('Products unpublished successfully!', 'info');
                        break;
                    case 'delete':
                        if (confirm(`Are you sure you want to delete ${this.selectedProducts.length} product(s)?`)) {
                            this.products = this.products.filter(p =>
                                !this.selectedProducts.includes(p.id)
                            );
                            this.filterProducts();
                            this.calculateStats();
                            this.showNotification('Products deleted successfully!', 'success');
                        }
                        break;
                }

                this.selectedProducts = [];
                this.calculateStats();

            }
            ,

            editProduct(product) {
                const productForm = Alpine.store('productFormStore');
                if (productForm) {
                    productForm.openModal('edit', product);
                }
            }
            ,


            viewProduct(product) {
                const productForm = Alpine.store('productFormStore');
                if (productForm) {
                    productForm.openModal('view', product);
                }
            }
            ,

            deleteProduct(product) {
                Swal.fire({
                    title: `Bạn có chắc muốn xóa "${product.name}"?`,
                    text: "Thao tác này không thể hoàn tác!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Xóa',
                    cancelButtonText: 'Hủy'
                }).then(result => {
                    if (result.isConfirmed) {
                        fetch(`/admin/api/products/${product.id}`, {
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
                                    this.products = this.products.filter(p => p.id !== product.id);
                                    this.filterProducts();
                                    this.calculateStats();
                                }
                            })
                    }
                })
            }
            ,

            exportProducts() {
                const csvContent = "data:text/csv;charset=utf-8," +
                    "Name,SKU,Category,Price,Stock,Status,Created\n" +
                    this.filteredProducts.map(p =>
                        `"${p.name}","${p.sku}","${p.category}","${p.price}","${p.stock}","${p.status}","${p.created}"`
                    ).join("\n");

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "products.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showNotification('Products exported successfully!', 'success');
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
                if (this.chartsInitialized) return;
                this.initSalesChart();
                this.initCategoryChart();
                this.chartsInitialized = true;
            }
            ,

            initSalesChart() {
                const theme = Alpine.store('themeStoreSwitch').currentTheme;
                const data = this.topSellerData;
                const topSalesChartEL = document.getElementById('salesChart');
                if (!topSalesChartEL) return;

                const seriesData = data.map(item => item.totalSold);
                const categories = data.map(item => item.product_name);

                const options = {
                    series: [{name: 'Số lượng', data: seriesData}],
                    chart: {type: 'bar', height: 300, toolbar: {show: false}},
                    colors: ['#6366f1'],
                    plotOptions: {bar: {borderRadius: 6, horizontal: false, columnWidth: '25%'}},
                    dataLabels: {enabled: false},
                    stroke: {show: true, width: 2, colors: ['transparent']},
                    xaxis: {categories},
                    yaxis: {
                        title: {text: 'Số lượng'}
                    },
                    tooltip: {
                        theme,
                        y: {formatter: val => val.toLocaleString('vi-VN') + " sản phẩm"}
                    }
                };

                if (!this.topSellersChart) {
                    this.topSellersChart = new ApexCharts(topSalesChartEL, options);
                    this.topSellersChart.render();
                } else {
                    this.topSellersChart.updateSeries([{data: seriesData}]);
                    this.topSellersChart.updateOptions({xaxis: {categories}, tooltip: {theme}});
                }
            }
            ,

            initCategoryChart() {
                const categoryChart = document.getElementById('categoryChart');
                if (!categoryChart) {
                    console.warn('Category chart element not found');
                    return;
                }

                // Clear any existing chart content
                categoryChart.innerHTML = '';

                try {

                    const chartData = {
                        series: this.categoryStats.map(cat => cat.count),
                        chart: {
                            type: 'donut',
                            height: 200
                        },
                        labels: this.categoryStats.map(cat => cat.name),
                        colors: this.categoryStats.map(cat => cat.color),
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
                                    return val + " products"
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

            get paginatedProducts() {
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.filteredProducts.slice(start, end);
            }
            ,

            get totalPages() {
                return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
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
            ,
            initInteractiveElements() {
                document.addEventListener('click', (e) => {
                    if (e.target.matches('[data-chart-period]')) {
                        const period = e.target.dataset.chartPeriod;
                        this.updateChartPeriod(period);

                        document.querySelectorAll('[data-chart-period]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        e.target.classList.add('active');
                    }
                });

            }
            ,


            updateChartPeriod(period) {
                let daysCount = 0;
                switch (period) {
                    case '7d':
                        daysCount = 7;
                        break;
                    case '30d':
                        daysCount = 30;
                        break;
                    case '90d':
                        daysCount = 90;
                        break;
                    case '1y':
                        daysCount = 365;
                        break;
                }
                this.topSellerData = this.getTopSellers(daysCount);
                this.initSalesChart();
            },


            changeTheme(newTheme) {
                const theme = newTheme === 'dark' ? 'dark' : 'light';
                if (this.topSellersChart) {
                    this.topSellersChart.updateOptions({
                        chart: {
                            foreColor: theme
                        },
                        xaxis: {
                            labels: {
                                style: {
                                    colors: theme === "dark" ? "white" : "black"
                                }
                            }
                        },
                        yaxis: {
                            title: {
                                text: 'Số lượng',
                                style: {
                                    color: theme === "dark" ? "white" : "black",
                                }
                            },
                            labels: {
                                style: {
                                    colors: theme === "dark" ? "white" : "black",

                                }
                            }
                        },
                        tooltip: {
                            theme: theme,
                            style: {
                                color: theme
                            }
                        }
                    });
                }

            }
            ,
        })
    )
    ;


    Alpine.data('productForm', () => ({
        init() {
            Alpine.store('productFormStore', this);
        },
        originalImg: null,
        mode: null,
        productId: null,
        form: {
            name: '',
            brand: '',
            category: '',
            price: '',
            description: '',
            variants: [],
            image_url: null,
            galleryImages: [],
            imagePre: null
        },

        openModal(mode, product = null) {
            this.mode = mode;
            this.resetForm();

            if (product) {
                this.editMode = true;
                this.productId = product.id;
                this.form.name = product.name;
                this.form.brand = product.brand.id;
                this.form.category = product.category.id;
                this.form.price = product.price;
                this.form.description = product.description;
                this.form.image_url = product.image;
                this.originalImg = product.image;
                this.form.variants = product.variants.map(v => ({
                    color: v.color,
                    size: v.size,
                    stock: v.stock
                }));
                if (product.gallery_images && product.gallery_images.length > 0) {
                    this.form.galleryImages = product.gallery_images.map(url => ({
                        file: null,
                        url: url
                    }));
                }

            }
            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        }
        ,

        resetForm() {
            this.form = {
                name: '',
                brand: '',
                category: '',
                price: '',
                description: '',
                variants: [],
                image_url: null,
                imagePre: null,
                galleryImages: []
            };
            this.productId = null;
            this.originalImg = null;
            const fileInput = document.querySelector('#productImageInput');
            if (fileInput) fileInput.value = null;
        }
        ,


        isProductInfoValid() {
            return (
                this.form.name.trim() &&
                this.form.brand &&
                this.form.category &&
                this.form.price
            );
        }
        ,

        saveProduct() {
            if (!this.isProductInfoValid() || !this.form.description || this.form.variants.length === 0) {
                Swal.fire({
                    title: 'Lỗi',
                    text: 'Vui lòng điền đầy đủ thông tin bắt buộc và ít nhất một biến thể',
                    icon: 'warning'
                });
                return;
            }

            const formData = new FormData();
            formData.append('name', this.form.name);
            formData.append('brand', this.form.brand);
            formData.append('category', this.form.category);
            formData.append('price', this.form.price);
            formData.append('description', this.form.description);
            formData.append('variants', JSON.stringify(this.form.variants));
            if (this.form.imagePre) {
                formData.append('image', this.form.imagePre);
            } else if (this.form.image_url !== this.originalImg) {
                formData.append('image_url', this.form.image_url);
            }

            this.form.galleryImages.forEach((img) => {
                if (img.file) formData.append('gallery_images', img.file);
            });

            const url = this.editMode
                ? `/admin/api/products/${this.productId}`
                : `/admin/api/products`;

            fetch(url, {
                method: "POST",
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: this.editMode ? 'Cập nhật thành công!' : 'Đã thêm sản phẩm!',
                            icon: 'success'
                        });
                        this.resetForm();
                        const productTable = Alpine.store('productTableStore');
                        if (productTable) {
                            productTable.loadDataProducts();
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

    Alpine.data('themeSwitch', () => ({
        currentTheme: 'light',
        init() {
            this.currentTheme = localStorage.getItem('theme') || 'light';
            Alpine.store('themeStoreSwitch', this);
            this.applyTheme();
        },

        toggle() {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme();
            localStorage.setItem('theme', this.currentTheme);
            Alpine.store("productTableStore").changeTheme(this.currentTheme);
        },

        applyTheme() {
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        }
    }));
})
;