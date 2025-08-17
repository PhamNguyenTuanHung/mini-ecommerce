document.addEventListener('alpine:init', () => {
    Alpine.data('orderTable', () => ({
        orders: [],
        filteredOrders: [],
        selectedOrders: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        statusFilter: '',
        dateFilter: '',
        sortField: 'orderNumber',
        sortDirection: 'desc',
        isLoading: false,
        chartsInitialized: false,
        selectedOrder: null,

        // Statistics
        stats: {
            total: 0,
            processing: 0,
            pending: 0,
            shipping: 0,
            delivered: 0,
            cancelled: 0,
            revenue: 0
        },
        revenueToday: 0,
        statusStats: [],
        init() {
            this.loadDataOrders();
            this.calculateStats();

            // Delay chart initialization to ensure DOM is fully ready
            setTimeout(() => {
                this.initCharts();
            }, 500);
        },

        loadDataOrders() {
            this.loading = true;
            fetch('/admin/api/orders', {
                method: "GET"
            })
                .then(res => res.json())
                .then(data => {
                    this.orders = data
                    this.filterOrders()
                    this.calculateStats()
                    this.initCharts()
                    this.initOrderTrendsChart()
                })
                .catch(error => {
                    console.error('Lỗi khi load đơn hàng:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        calculateStats() {
            this.stats.total = this.orders.length;
            this.stats.pending = this.orders.filter(o => o.status === 'pending').length;
            this.stats.processing = this.orders.filter(o => o.status === 'processing').length;
            this.stats.shipping = this.orders.filter(o => o.status === 'shipping').length;
            this.stats.delivered = this.orders.filter(o => o.status === 'delivered').length;
            this.stats.cancelled = this.orders.filter(o => o.status === 'cancelled').length;
            const today = new Date()
            this.stats.revenue = this.orders
                .filter(o => o.status === 'delivered')
                .filter(o => {
                    const orderDate = new Date(o.date);
                    return orderDate===today;
                })
                .reduce((sum, o) => sum + o.total, 0);

            const statuses = {};
            this.orders.forEach(order => {
                statuses[order.status] = (statuses[order.status] || 0) + 1;
            });

            this.statusStats = Object.entries(statuses).map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count,
                percentage: Math.round((count / this.orders.length) * 100),
                color: this.getStatusColor(name)
            }));
        },

        getStatusColor(status) {
            const colors = {
                pending: '#ffc107',
                processing: '#0d6efd',
                shipping: '#17a2b8',
                delivered: '#28a745',
                cancelled: '#dc3545'
            };
            return colors[status] || '#6c757d';
        },

        getRevenueToDay() {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const revenueToday = this.orders.reduce((sum, order) => {
                const d = new Date(order.orderDate);
                if (d.getDate() === today.getDate()
                    && d.getMonth() === today.getMonth()
                    && d.getFullYear() === today.getFullYear()) {
                    return sum + (Number(order.total) || 0);
                }
                return sum;
            }, 0);
        },

        filterOrders() {
            this.filteredOrders = this.orders.filter(order => {
                const matchesSearch = !this.searchQuery ||
                    order.id.toString().includes(this.searchQuery.toLowerCase()) ||
                    order.customer.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    order.customer.email.toLowerCase().includes(this.searchQuery.toLowerCase());

                const matchesStatus = !this.statusFilter || order.status === this.statusFilter;

                const matchesDate = !this.dateFilter || this.matchesDateFilter(order.orderDate);

                return matchesSearch && matchesStatus && matchesDate;
            });

            this.sortOrders();
            this.currentPage = 1;
        },

        matchesDateFilter(orderDate) {
            const today = new Date();
            const orderDateObj = new Date(orderDate);

            switch (this.dateFilter) {
                case 'today':
                    return orderDateObj.toDateString() === today.toDateString();
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDateObj >= weekAgo;
                case 'month':
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return orderDateObj >= monthAgo;
                default:
                    return true;
            }
        },

        sortOrders() {
            this.filteredOrders.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];

                if (this.sortField === 'total') {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                } else if (this.sortField === 'orderDate') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else {
                    aVal = (aVal ?? '').toString().toLowerCase();
                    bVal = (bVal ?? '').toString().toLowerCase();
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
            this.filterOrders();
        },

        toggleAll(checked) {
            if (checked) {
                this.selectedOrders = this.paginatedOrders.map(o => o.id);
            } else {
                this.selectedOrders = [];
            }
        },

        bulkAction(action) {
            if (this.selectedOrders.length === 0) return;

            const selectedOrderObjects = this.orders.filter(o =>
                this.selectedOrders.includes(o.id)
            );

            switch (action) {
                case 'processing':
                    selectedOrderObjects.forEach(order => {
                        if (order.status === 'pending') {
                            order.status = 'processing';
                        }
                    });
                    this.showNotification('Orders marked as processing!', 'success');
                    break;
                case 'shipped':
                    selectedOrderObjects.forEach(order => {
                        if (order.status === 'processing') {
                            order.status = 'shipped';
                        }
                    });
                    this.showNotification('Orders marked as shipped!', 'success');
                    break;
                case 'delivered':
                    selectedOrderObjects.forEach(order => {
                        if (order.status === 'shipped') {
                            order.status = 'delivered';
                        }
                    });
                    this.showNotification('Orders marked as delivered!', 'success');
                    break;
            }

            this.selectedOrders = [];
            this.calculateStats();
        },

        updateStatusOrder(order) {
            fetch(`/admin/api/orders/${order.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    'status': order.status
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.loadDataOrders();
                        this.calculateStats();
                        this.initStatusChart();

                        Swal.fire({
                            title: "Đã cập nhật!",
                            text: "Đơn hàng đã cập nhật thành công.",
                            icon: "success",
                            timer: 2000
                        });
                    } else {
                        Swal.fire({
                            title: "Thất bại!",
                            text: data.message || "Cập nhật thất bại.",
                            icon: "error"
                        });
                    }
                });
        },

        viewOrder(order) {
            this.loading = true;
            fetch(`/admin/api/orders/${order.id}`, {
                method: "GET"
            })
                .then(res => res.json())
                .then(data => {
                    this.selectedOrder = data
                    console.log(this.selectedOrder)
                    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
                    modal.show();
                })
                .catch(error => {
                    console.error('Lỗi khi load đơn hàng:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        }
        ,

        trackOrder(order) {
            console.log('Track order:', order);
            this.showNotification('Order tracking would open here', 'info');
        }
        ,

        printInvoice(order) {
            console.log('Print invoice for order:', order);
            this.showNotification('Invoice would be generated and printed', 'info');
        }
        ,

        cancelOrder(order) {
            Swal.fire({
                title: `Bạn có chắc muốn hủy "${order.id}"?`,
                text: "Thao tác này không thể hoàn tác!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Hủy đơn hàng',
                cancelButtonText: 'Hủy'
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/admin/api/orders/${order.id}/cancel`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    title: "Đã hủy!",
                                    text: "Đơn hàng đã được hủy thành công.",
                                    icon: "success",
                                    timer: 2000
                                });
                                this.loadDataOrders();
                                this.filterOrders();
                                this.calculateStats();
                            }
                        })
                }
            })
        }
        ,

        exportOrders() {
            const csvContent = "data:text/csv;charset=utf-8," +
                "Order Number,Customer,Email,Items,Total,Status,Date\n" +
                this.filteredOrders.map(o =>
                    `"${o.orderNumber}","${o.customer.name}","${o.customer.email}","${o.itemCount}","${o.total}","${o.status}","${o.orderDate}"`
                ).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "orders.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Orders exported successfully!', 'success');
        }
        ,

        formatCurrency(value) {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(value);
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
        }
        ,

        initCharts() {
            // Prevent multiple chart initializations
            if (this.chartsInitialized) return;

            this.initOrderTrendsChart();
            this.initStatusChart();
            this.chartsInitialized = true;
        }
        ,

        initOrderTrendsChart() {
            const chartElement = document.getElementById('orderTrendsChart');
            if (!chartElement) {
                console.warn('Order trends chart element not found');
                return;
            }

            // Clear any existing chart content
            chartElement.innerHTML = '';

            try {
                const trendsData = {
                    series: [{
                        name: 'Orders',
                        data: [12, 19, 15, 27, 24, 32, 28]
                    }, {
                        name: 'Revenue',
                        data: [1200, 1900, 1500, 2700, 2400, 3200, 2800]
                    }],
                    chart: {
                        type: 'area',
                        height: 300,
                        toolbar: {show: false}
                    },
                    colors: ['#6366f1', '#10b981'],
                    fill: {
                        type: 'gradient',
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.7,
                            opacityTo: 0.3,
                        }
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 2
                    },
                    xaxis: {
                        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    },
                    yaxis: [{
                        title: {
                            text: 'Orders'
                        }
                    }, {
                        opposite: true,
                        title: {
                            text: 'Revenue ($)'
                        }
                    }],
                    tooltip: {
                        y: [{
                            formatter: function (val) {
                                return val + " orders"
                            }
                        }, {
                            formatter: function (val) {
                                return "$" + val
                            }
                        }]
                    }
                };

                const chart = new ApexCharts(chartElement, trendsData);
                chart.render();
            } catch (error) {
                console.error('Error rendering order trends chart:', error);
            }
        }
        ,

        initStatusChart() {
            const chartElement = document.getElementById('statusChart');
            if (!chartElement) {
                console.warn('Status chart element not found');
                return;
            }

            chartElement.innerHTML = '';

            try {
                const chartData = {
                    series: this.statusStats.map(stat => stat.count),
                    chart: {
                        type: 'donut',
                        height: 200
                    },
                    labels: this.statusStats.map(stat => stat.name),
                    colors: this.statusStats.map(stat => stat.color),
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
                                return val + " orders"
                            }
                        }
                    }
                };

                const chart = new ApexCharts(chartElement, chartData);
                chart.render();
            } catch (error) {
                console.error('Error rendering status chart:', error);
            }
        }
        ,

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


// Search component for header
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