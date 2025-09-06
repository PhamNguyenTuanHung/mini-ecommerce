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

        orderStats: {
            processing: 0,
            pending: 0,
            shipping: 0,
            delivered: 0,
            cancelled: 0
        },
        statusStats: [],
        period: 'week',
        revenueToday: 0,

        newOrders: 0,
        revenueCurrent: 0,
        growthOrderPercentage: 0,
        growthRevenuePercentage: 0,

        salesStats: {
            totalOrders: 0,
            totalRevenue: 0
        },


        init() {
            Alpine.store("ordersTableStore", this);
            this.loadDataOrders();
            this.calculateOrderStats();
            setTimeout(() => {
                this.orderTrendsData = this.getOrderTrendsData(this.period);
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
                    this.calculateOrderStats();
                    this.calculateNewOrders(this.period);
                })
                .catch(error => {
                    console.error('Lỗi khi load đơn hàng:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        calculateOrderStats() {
            this.orderStats.pending = this.orders.filter(o => o.status === 'pending').length;
            this.orderStats.processing = this.orders.filter(o => o.status === 'processing').length;
            this.orderStats.shipping = this.orders.filter(o => o.status === 'shipping').length;
            this.orderStats.delivered = this.orders.filter(o => o.status === 'delivered').length;
            this.orderStats.cancelled = this.orders.filter(o => o.status === 'cancelled').length;
            const statuses = {};
            this.orders.forEach(order => {
                statuses[order.status] = (statuses[order.status] || 0) + 1;
            });

            const statusNameMap = {
                pending: "Chờ xử lý",
                delivered: "Hoàn thành",
                cancelled: "Đã hủy",
                shipping: "Đang giao",
                processing: "Đang xử lý"
            };

            this.statusStats = Object.entries(statuses).map(([name, count]) => ({
                name: statusNameMap[name] || name,
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
                        this.initStatusChart();
                        this.calculateOrderStats();
                        this.getRevenueToDay();
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
            const header = "Order Number,Customer,Email,Items,Total,Status,Date\n";
            const rows = this.filteredOrders.map(o =>
                `"${o.id}","${o.customer.name}","${o.customer.email}","${o.itemCount}","${o.total}","${o.status}","${o.orderDate}"`
            ).join("\n");

            // Thêm BOM UTF-8
            const csvContent = "\uFEFF" + header + rows;

            const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
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


        getPeriodRangeWithPrevious(period = 'month') {
            const today = new Date();
            let startCurrent, endCurrent, startPrevious, endPrevious;

            switch (period) {
                case 'today': {
                    startCurrent = new Date(today);
                    startCurrent.setHours(0, 0, 0, 0);

                    endCurrent = new Date(today);
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(startCurrent);
                    startPrevious.setDate(startPrevious.getDate() - 1);
                    startPrevious.setHours(0, 0, 0, 0);

                    endPrevious = new Date(startPrevious);
                    endPrevious.setHours(23, 59, 59, 999);
                    break;
                }

                case 'week': {
                    const dayOfWeek = today.getDay() || 7; // CN=0 → 7
                    startCurrent = new Date(today);
                    startCurrent.setDate(today.getDate() - dayOfWeek + 1); // thứ 2
                    startCurrent.setHours(0, 0, 0, 0);

                    endCurrent = new Date(startCurrent);
                    endCurrent.setDate(startCurrent.getDate() + 6); // CN
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(startCurrent);
                    startPrevious.setDate(startPrevious.getDate() - 7);
                    startPrevious.setHours(0, 0, 0, 0);

                    endPrevious = new Date(startCurrent);
                    endPrevious.setDate(endPrevious.getDate() - 1);
                    endPrevious.setHours(23, 59, 59, 999);
                    break;
                }

                case 'month': {
                    startCurrent = new Date(today.getFullYear(), today.getMonth(), 1);
                    startCurrent.setHours(0, 0, 0, 0);

                    endCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    startPrevious.setHours(0, 0, 0, 0);

                    endPrevious = new Date(today.getFullYear(), today.getMonth(), 0);
                    endPrevious.setHours(23, 59, 59, 999);
                    break;
                }

                case 'quarter': {
                    const quarter = Math.floor(today.getMonth() / 3);
                    startCurrent = new Date(today.getFullYear(), quarter * 3, 1);
                    startCurrent.setHours(0, 0, 0, 0);

                    endCurrent = new Date(today.getFullYear(), quarter * 3 + 3, 0);
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(today.getFullYear(), quarter * 3 - 3, 1);
                    startPrevious.setHours(0, 0, 0, 0);

                    endPrevious = new Date(today.getFullYear(), quarter * 3, 0);
                    endPrevious.setHours(23, 59, 59, 999);
                    break;
                }

                case 'year': {
                    startCurrent = new Date(today.getFullYear(), 0, 1);
                    startCurrent.setHours(0, 0, 0, 0);

                    endCurrent = new Date(today.getFullYear(), 11, 31);
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(today.getFullYear() - 1, 0, 1);
                    startPrevious.setHours(0, 0, 0, 0);

                    endPrevious = new Date(today.getFullYear() - 1, 11, 31);
                    endPrevious.setHours(23, 59, 59, 999);
                    break;
                }

                default: {
                    // fallback = month
                    startCurrent = new Date(today.getFullYear(), today.getMonth(), 1);
                    endCurrent = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endCurrent.setHours(23, 59, 59, 999);

                    startPrevious = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    endPrevious = new Date(today.getFullYear(), today.getMonth(), 0);
                    endPrevious.setHours(23, 59, 59, 999);
                }
            }

            return {startCurrent, endCurrent, startPrevious, endPrevious};
        }
        ,


        getPeriodRange(period = 'week') {
            const today = new Date();
            let start, end = today;

            switch (period) {
                case 'today': {
                    start = new Date(today);
                    start.setHours(0, 0, 0, 0);

                    end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    break;
                }
                case 'week': {
                    const dayOfWeek = today.getDay() || 7; // Sunday = 0 → 7
                    start = new Date(today);
                    start.setDate(today.getDate() - dayOfWeek + 1); // Monday
                    break;
                }
                case 'month':
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
                case 'quarter': {
                    const quarter = Math.floor(today.getMonth() / 3);
                    start = new Date(today.getFullYear(), quarter * 3, 1);
                    break;
                }
                case 'year':
                    start = new Date(today.getFullYear(), 0, 1);
                    break;
                default :
                    break;
            }

            return {start, end};
        }
        ,


        calculateNewOrders(period) {
            const {startCurrent, endCurrent, startPrevious, endPrevious} = this.getPeriodRangeWithPrevious(period);
            const orderInRange = (start, end) => {
                const filtered = this.orders.filter(o => {
                    const d = new Date(o.orderDate);
                    return !isNaN(d) && d >= start && d <= end;
                });
                return {
                    totalOrders: filtered.length,
                    totalRevenue: filtered.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
                };
            };

            const orderCurrent = orderInRange(startCurrent, endCurrent);
            const orderPrevious = orderInRange(startPrevious, endPrevious);

            const newCurrent = orderCurrent.totalOrders;
            const newPrevious = orderPrevious.totalOrders;

            const revenueCurrent = orderCurrent.totalRevenue;
            const revenuePrevious = orderPrevious.totalRevenue;
            const growthOrderPercentage = newPrevious === 0 ? (newCurrent > 0 ? 100 : 0) : ((newCurrent - newPrevious) / newPrevious) * 100;
            const growthRevenuePercentage = revenuePrevious === 0 ? (revenueCurrent > 0 ? 100 : 0) : ((revenueCurrent - revenuePrevious) / revenuePrevious) * 100

            this.newOrders = newCurrent;
            this.revenueCurrent = revenueCurrent;
            this.growthOrderPercentage = parseFloat(growthOrderPercentage.toFixed(2));
            this.growthRevenuePercentage = parseFloat(growthRevenuePercentage.toFixed(2));
        },


        getPeriodRanges(period = 'week') {
            const now = new Date();
            const ranges = [];
            const labels = [];

            switch (period) {
                case 'today': {
                    const start = new Date(now);
                    start.setHours(0, 0, 0, 0);

                    const end = new Date(now);
                    end.setHours(23, 59, 59, 999);

                    ranges.push({start, end});
                    labels.push(start.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}));
                    break;
                }

                case 'week': {
                    const dayOfWeek = now.getDay() || 7; // Sunday=0 → 7
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - dayOfWeek + 1); // Monday

                    for (let i = 0; i < 7; i++) {
                        const dayStart = new Date(startOfWeek);
                        dayStart.setDate(startOfWeek.getDate() + i);
                        dayStart.setHours(0, 0, 0, 0);

                        const dayEnd = new Date(dayStart);
                        dayEnd.setHours(23, 59, 59, 999);

                        ranges.push({start: dayStart, end: dayEnd});
                        labels.push(dayStart.toLocaleDateString('en-US', {weekday: 'short'}));
                    }
                    break;
                }

                case 'month': {
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    for (let i = 1; i <= daysInMonth; i++) {
                        const dayStart = new Date(now.getFullYear(), now.getMonth(), i, 0, 0, 0);
                        const dayEnd = new Date(now.getFullYear(), now.getMonth(), i, 23, 59, 59, 999);

                        ranges.push({start: dayStart, end: dayEnd});
                        labels.push(i.toString());
                    }
                    break;
                }

                case 'quarter': {
                    const quarter = Math.floor(now.getMonth() / 3);
                    for (let i = 0; i < 3; i++) {
                        const monthIndex = quarter * 3 + i;
                        const monthStart = new Date(now.getFullYear(), monthIndex, 1, 0, 0, 0);
                        const monthEnd = new Date(now.getFullYear(), monthIndex + 1, 0, 23, 59, 59, 999);

                        ranges.push({start: monthStart, end: monthEnd});
                        labels.push(monthStart.toLocaleString('en-US', {month: 'short'}));
                    }
                    break;
                }

                case 'year': {
                    for (let i = 0; i < 12; i++) {
                        const monthStart = new Date(now.getFullYear(), i, 1, 0, 0, 0);
                        const monthEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59, 999);

                        ranges.push({start: monthStart, end: monthEnd});
                        labels.push(monthStart.toLocaleString('en-US', {month: 'short'}));
                    }
                    break;
                }

                default:
                    console.warn('Invalid period:', period);
            }

            return {ranges, labels};
        },

        getOrderTrendsData(period = 'week') {
            const {ranges, labels} = this.getPeriodRanges(period);
            const ordersData = [];
            const revenueData = [];

            ranges.forEach(range => {
                const filtered = this.orders.filter(o => {
                    const d = new Date(o.orderDate);
                    return !isNaN(d) && d >= range.start && d <= range.end;
                });

                ordersData.push(filtered.length);
                revenueData.push(filtered.reduce((sum, o) => sum + o.total, 0));
            });

            return {labels, ordersData, revenueData};
        },


        initCharts() {
            this.initOrderTrendsChart();
            this.initStatusChart();
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
            const {labels, ordersData, revenueData} = this.orderTrendsData;

            try {
                const trendsData = {
                    series: [{
                        name: 'Orders',
                        data: ordersData
                    }, {
                        name: 'Revenue',
                        data: revenueData
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
                        categories: labels
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

            const statusNameMap = {
                pending: "Chờ xử lý",
                delivered: "Hoàn thành",
                cancelled: "Đã hủy",
                shipping: "Đang giao",
                processing: "Đang xử lý"
            };

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


        updatePeriod(period) {
            this.calculateNewOrders(period);
            this.orderTrendsData = this.getOrderTrendsData(period);
            this.initOrderTrendsChart();
            this.period = period;
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
        },

        exportData() {
            fetch('/admin/api/export-orders', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    orders: this.filteredOrders
                })
            })
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'orders-export.csv';
                    a.click();
                });

        }
        ,
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