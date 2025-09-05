document.addEventListener('alpine:init', () => {

    Alpine.data('page', () => ({
        current: 'overview',
        period: 'week',
        exportFormat: 'pdf',
        init() {
            Alpine.store('pageStore', this);
        },
        updateReports() {
            console.log('Cập nhật báo cáo', this.current, this.period);
            const storesMap = {
                overview: 'reportsComponentStore',
                inventory: 'productTableStore',
                customer: 'userTableStore',
                financial: 'ordersTableStore',
            };
            const storeName = storesMap[this.current];
            if (storeName) {
                Alpine.store(storeName)?.updatePeriod(this.period);
            }
        },
        exportReport() {
            console.log('Xuất báo cáo', this.current, this.period);
            const storesMap = {
                overview: 'reportsComponentStore',
                inventory: 'productTableStore',
                customer: 'userTableStore',
                financial: 'ordersTableStore',
            };
            const storeName = storesMap[this.current];
            if (storeName) {
                Alpine.store(storeName)?.exportData(this.period);
            }
        }

    }))
    ;

    //Report
    Alpine.data('reportsComponent', () => ({
            period: 'week',
            reportType: 'overview',
            exportFormat: 'pdf',

            recentReports: [],
            topProducts: [],
            users: [],
            orders: [],
            products: [],
            salesData: [],
            productStock: [],
            revenueTrend: [],


            productStats: {
                total: 0,
                inStock: 0,
                lowStock: 0,
                totalValue: 0,
                totalStock: 0
            },

            orderStats: {
                processing: 0,
                pending: 0,
                shipping: 0,
                delivered: 0,
                cancelled: 0
            },

            userStats: {
                newUsers: 0,
                active: 0,
                inactive: 0,
            },

            saleStats: {
                totalOrder: 0,
                totalRevenue: 0
            },

            chartsInitialized: false,
            revenueTrendsChart: null,
            orderTrendsData: [],

            kpis: {
                revenue: 125750,
                revenueChange: 12.5,
                orders: 1247,
                ordersChange: 8.3,
                customers: 892,
                customersChange: 15.2,
            },

            async init() {
                Alpine.store('reportsComponentStore', this);
                await this.loadDataUsers();
                await this.loadDataOrders();
                await this.loadDataProducts();
                this.revenueTrend = this.calculateRevenueTrends(this.period);
                this.topProducts = this.getTopSellers(this.period);
                this.calculateSales(this.period);
                this.calculateUserStats(this.period);
                this.calculateStock();
                this.calculateOrderStats();
                setTimeout(() => {
                    this.initCharts();
                }, 500);
            },

            async loadDataUsers() {
                await fetch('/admin/api/users', {
                    method: "GET"
                })
                    .then(res => res.json())
                    .then(data => {
                        this.users = data;
                        this.calculateUserStats(this.period);
                        this.kpis.customers = this.users.length;
                    })
                    .catch(error => {
                        console.error('Lỗi khi load user:', error);
                    });
            },

            async loadDataOrders() {
                await fetch('/admin/api/orders', {
                    method: "GET"
                })
                    .then(res => res.json())
                    .then(data => {
                        this.orders = data;
                        this.kpis.orders = this.orders.length;
                    })
                    .catch(error => {
                        console.error('Lỗi khi load đơn hàng:', error);
                    });
            },

            async loadDataProducts() {
                await fetch('/admin/api/products', {
                    method: 'GET'
                })
                    .then(response => response.json())
                    .then(data => {
                        this.products = data.products;
                        this.salesData = data.sales_data;
                    })
                    .catch(error => {
                        console.error('Lỗi khi load sản phẩm:', error);
                    });
            },


            generateReport() {
                this.showNotification('New report generation would start here', 'info');
            }
            ,


            // downloadReport(report) {
            //     console.log('Downloading report:', report);
            //     this.showNotification(`Downloading ${report.name}...`, 'success');
            // }
            // ,
            //
            // shareReport(report) {
            //     console.log('Sharing report:', report);
            //     this.showNotification('Share functionality would open here', 'info');
            // }
            // ,
            //
            // duplicateReport(report) {
            //     const newReport = {
            //         ...report,
            //         id: `RPT-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
            //         name: `${report.name} (Copy)`,
            //         generated: new Date().toISOString().split('T')[0],
            //         status: 'ready'
            //     };
            //     this.recentReports.unshift(newReport);
            //     this.showNotification('Report duplicated successfully!', 'success');
            // }
            // ,
            //
            // deleteReport(report) {
            //     if (confirm(`Are you sure you want to delete "${report.name}"?`)) {
            //         this.recentReports = this.recentReports.filter(r => r.id !== report.id);
            //         this.showNotification('Report deleted successfully!', 'success');
            //     }
            // }
            // ,

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


            getPeriodRange(period = 'week') {
                const today = new Date();
                let start, end;

                switch (period) {
                    case 'today': {
                        start = new Date(today);
                        start.setHours(0, 0, 0, 0);

                        end = new Date(today);
                        end.setHours(23, 59, 59, 999);
                        break;
                    }
                    case 'week': {
                        const dayOfWeek = today.getDay() || 7;
                        start = new Date(today);
                        start.setDate(today.getDate() - dayOfWeek + 1);
                        start.setHours(0, 0, 0, 0);

                        end = new Date(start);
                        end.setDate(start.getDate() + 6);
                        end.setHours(23, 59, 59, 999);
                        break;
                    }
                    case 'month': {
                        start = new Date(today.getFullYear(), today.getMonth(), 1);
                        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        end.setHours(23, 59, 59, 999);
                        break;
                    }
                    case 'quarter': {
                        const quarter = Math.floor(today.getMonth() / 3);
                        start = new Date(today.getFullYear(), quarter * 3, 1);
                        end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
                        end.setHours(23, 59, 59, 999);
                        break;
                    }
                    case 'year': {
                        start = new Date(today.getFullYear(), 0, 1);
                        end = new Date(today.getFullYear(), 11, 31);
                        end.setHours(23, 59, 59, 999);
                        break;
                    }
                    default: {
                        start = today;
                        end = today;
                        break;
                    }
                }

                return {start, end};
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

                this.statusStats = Object.entries(statuses).map(([name, count]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    count,
                    percentage: Math.round((count / this.orders.length) * 100),
                }));
            },

            calculateStock() {
                this.productStats.totalStock = this.products.reduce((sum, p) => sum + p.stock, 0);
            }
            ,

            getTopSellers(period = 'month') {
                const {start, end} = this.getPeriodRange(period)
                const filteredSales = this.salesData.filter(sale => {
                    const d = new Date(sale.date);
                    return !isNaN(d) && d >= start && d <= end;
                });

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

            calculateSales(period = 'month') {
                const {startCurrent, endCurrent, startPrevious, endPrevious} = this.getPeriodRangeWithPrevious(period);

                const countOrdersInRange = (start, end) =>
                    this.orders.filter(order => {
                        const d = new Date(order.orderDate);
                        return !isNaN(d) && d >= start && d <= end;
                    });

                const currentOrders = countOrdersInRange(startCurrent, endCurrent);
                const previousOrders = countOrdersInRange(startPrevious, endPrevious);

                const totalOrdersCurrent = currentOrders.length;
                const totalOrdersPrevious = previousOrders.length;

                const ordersChane = totalOrdersPrevious === 0
                    ? (totalOrdersCurrent > 0 ? 100 : 0)
                    : ((totalOrdersCurrent - totalOrdersPrevious) / totalOrdersPrevious) * 100;

                const revenueCurrent = currentOrders
                    .filter(order => order.status === 'delivered')
                    .reduce((sum, order) => sum + order.total, 0);

                const revenuePrevious = previousOrders
                    .filter(order => order.status === 'delivered')
                    .reduce((sum, order) => sum + order.total, 0);

                const revenueChange = revenuePrevious === 0
                    ? (revenueCurrent > 0 ? 100 : 0)
                    : ((revenueCurrent - revenuePrevious) / revenuePrevious) * 100;

                this.kpis.revenue = revenueCurrent;
                this.kpis.orders = currentOrders.length;
                this.kpis.revenueChange = parseFloat(revenueChange.toFixed(2));
                this.kpis.ordersChange = parseFloat(ordersChane.toFixed(2));
            }
            ,

            calculateUserStats(period = 'week') {
                const {startCurrent, endCurrent, startPrevious, endPrevious} = this.getPeriodRangeWithPrevious(period);
                const countInRange = (start, end) =>
                    this.users.filter(u => {
                        const d = new Date(u.joinDate);
                        return !isNaN(d) && d >= start && d <= end;
                    });

                const filterUserCurrent = countInRange(startCurrent, endCurrent);
                const filterUserPrevious = countInRange(startPrevious, endPrevious);

                const newCurrent = filterUserCurrent.length;
                const newPrevious = filterUserPrevious.length;
                const activeCurrent = filterUserCurrent.filter(u => u.status === 'active').length;
                const inactiveCurrent = filterUserCurrent.filter(u => u.status === 'inactive').length;
                const customersChange = newPrevious === 0 ? (newCurrent > 0 ? 100 : 0) : ((newCurrent - newPrevious) / newPrevious) * 100;

                this.userStats.newUsers = newCurrent;
                this.userStats.active = activeCurrent;
                this.userStats.inactive = inactiveCurrent;
                this.kpis.customersChange = parseFloat(customersChange.toFixed(2));
                this.kpis.customers = newCurrent;
            }
            ,

            calculateRevenueTrends(period = 'week') {
                const orders = this.orders.filter(o => o.status === 'delivered');
                const now = new Date();
                const labels = [];
                const data = [];

                let ranges = [];

                switch (period) {
                    case 'today': {
                        const dayStart = new Date(now);
                        dayStart.setHours(0, 0, 0, 0);

                        const dayEnd = new Date(now);
                        dayEnd.setHours(23, 59, 59, 999);

                        ranges.push({start: dayStart, end: dayEnd});
                        labels.push(dayStart.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        }));
                        break;
                    }
                    case 'week': {
                        const dayOfWeek = now.getDay() || 7; // Sunday = 0 → 7
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
                        return {labels, data};
                }

                ranges.forEach(({start, end}) => {
                    const revenue = orders
                        .filter(o => {
                            const d = new Date(o.orderDate);
                            return d >= start && d <= end;
                        })
                        .reduce((sum, o) => sum + o.total, 0);
                    data.push(revenue);
                });

                return {labels, data};
            }
            ,

            initCharts() {
                if (this.chartsInitialized) return;
                this.initRevenueTrendsChart();
                this.initTopProductsChart();
                this.changeTheme(Alpine.store('themeStoreSwitch').currentTheme);
                this.chartsInitialized = true;
            }
            ,

            initRevenueTrendsChart() {
                const chartElement = document.getElementById('revenueTrendsChart');
                if (!chartElement) {
                    console.warn('Revenue trends chart element not found');
                    return;
                }
                chartElement.innerHTML = '';
                const {labels, data} = this.revenueTrend;

                const chartData = {
                    series: [{
                        name: 'Doanh thu',
                        data: data
                    }],
                    chart: {
                        type: 'area',
                        height: 350,
                        toolbar: {
                            show: true,
                            tools: {
                                download: true,
                                selection: true,
                                zoom: true,
                                zoomin: true,
                                zoomout: true,
                                pan: true,
                                reset: true
                            }
                        }
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
                        width: 3
                    },
                    xaxis: {
                        categories: labels,
                    },
                    yaxis: {
                        title: {text: 'Tổng (vnd)'},
                        labels: {
                            formatter: val => "vnd" + val.toLocaleString()
                        }
                    },
                    tooltip: {
                        y: {formatter: val => "$" + val.toLocaleString()}
                    },
                    legend: {position: 'top'}
                };

                if (!this.revenueTrendsChart) {
                    this.revenueTrendsChart = new ApexCharts(chartElement, chartData);
                    this.revenueTrendsChart.render();
                } else {
                    this.revenueTrendsChart.updateOptions(chartData);
                }
            }
            ,

            initTopProductsChart() {
                const chartElement = document.getElementById('topProductsChart');
                if (!chartElement) return;

                chartElement.innerHTML = '';

                const topProducts = Array.isArray(this.topProducts) ? this.topProducts : [];

                const series = topProducts.map(p => p.totalSold ?? 0);
                const labels = topProducts.map(p => p.product_name ?? 'Unknown');

                if (series.length === 0 || labels.length === 0) return;

                const chartData = {
                    series: series,
                    chart: {
                        type: 'donut',
                        height: 200
                    },
                    labels: labels,
                    colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '65%'
                            }
                        }
                    },
                    legend: {
                        show: false
                    },
                    tooltip: {
                        y: {
                            formatter: val => "$" + val
                        }
                    }
                };

                const chart = new ApexCharts(chartElement, chartData);
                chart.render();
            }
            ,

            updatePeriod(period) {
                this.calculateSales(period);
                this.calculateUserStats(period);
                this.topProducts = this.getTopSellers(period);
                this.revenueTrend = this.calculateRevenueTrends(period);
                this.initRevenueTrendsChart();
                this.initTopProductsChart();

                this.period = period;
            }
            ,


            exportData() {
                fetch('/admin/api/export-overview', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "total_users": this.users.length,
                        "new_users_this_period": this.userStats.newUsers,
                        "active_users": this.userStats.active,
                        "inactive_users": this.userStats.inactive,
                        "user_growth": this.kpis.customersChange,

                        //Order stats
                        "total_orders": this.orders.length,
                        "orders_this_period": this.kpis.orders,
                        "pending_orders": this.orderStats.pending,
                        "delivered_orders": this.orderStats.delivered,
                        "cancelled_orders": this.orderStats.cancelled,
                        "order_growth": this.kpis.ordersChange,

                        //Revenue
                        "total_revenue": this.orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0),
                        "revenue_this_period": this.kpis.revenue,
                        "revenue_growth": this.kpis.revenueChange,

                        //product
                        "total_products": this.productStats.totalStock,
                        "low_stock_products": this.productStats.lowStock,
                        "top_product": this.topProducts.map(p => p.product_name)[0],
                    })
                })
                    .then(res => res.blob())
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'overview-export.csv';
                        a.click();
                    });
            }
            ,

            changeTheme(newTheme) {
                const theme = newTheme === 'dark' ? 'dark' : 'light';
                if (this.revenueTrendsChart) {
                    this.revenueTrendsChart.updateOptions({
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
                                text: 'Tổng (vnd)',
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
//User
    Alpine.data('userTable', () => ({
        users: [],
        filteredUsers: [],
        selectedUsers: [],
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        statusFilter: '',
        orderFilter: '',
        roleFilter: '',
        sortField: 'name',
        sortDirection: 'asc',
        isLoading: false,
        selectedUser: null,
        period: 'week',

        growthPercentage: 0,
        recentActivities: [],

        topUsersChart: null,
        userGrowthChart: null,
        userGrowth: [],

        userStats: {
            total: 0,
            newUsers: 0,
            active: 0,
            inactive: 0,
        },

        activityIcons: {
            // Thêm / tạo mới
            add: {icon: 'bi-plus-circle', color: 'primary'},
            create: {icon: 'bi-plus-circle', color: 'primary'},
            register: {icon: 'bi-plus-circle', color: 'primary'},
            prepare: {icon: 'bi-plus-circle', color: 'primary'},
            cart_add: {icon: 'bi-plus-circle', color: 'primary'},

            // Cập nhật
            update: {icon: 'bi-pencil-square', color: 'warning'},
            edit: {icon: 'bi-pencil-square', color: 'warning'},
            cart_update: {icon: 'bi-pencil-square', color: 'warning'},

            // Xóa
            delete: {icon: 'bi-trash', color: 'danger'},
            remove: {icon: 'bi-trash', color: 'danger'},
            cancel: {icon: 'bi-trash', color: 'danger'},

            // Đăng nhập / Đăng xuất
            login: {icon: 'bi-box-arrow-in-right', color: 'success'},
            logout: {icon: 'bi-box-arrow-right', color: 'secondary'},

            // Thanh toán
            payment: {icon: 'bi-credit-card', color: 'info'},
            checkout: {icon: 'bi-credit-card', color: 'info'},
        },

        async init() {
            Alpine.store("userTableStore", this);
            await this.loadDataUsers();
            this.getRecentActivities();
            this.calculateUserStats(this.period);
            this.userGrowth = this.userGrowthData(this.period);
            setInterval(() => this.getRecentActivities(), 10000);
            this.changeTheme('')
        },

        async loadDataUsers() {
            this.loading = true;
            await fetch('/admin/api/users', {
                method: "GET"
            })
                .then(res => res.json())
                .then(data => {
                    this.users = data;
                    this.filterUsers();
                    this.initCharts();
                })
                .catch(error => {
                    console.error('Lỗi khi load user:', error);
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        getRecentActivities() {
            fetch('/admin/api/activity-logs', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(res => res.json())
                .then(data => {
                    this.recentActivities = data;
                })
        },

        filterUsers() {
            this.filteredUsers = this.users.filter(user => {
                const matchesSearch = this.searchQuery === '' ||
                    user.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(this.searchQuery.toLowerCase())

                const matchesStatus = this.statusFilter === '' || user.status === this.statusFilter;
                const matchesOrder = this.orderFilter === '' || user.totalOrders === this.orderFilter;

                return matchesSearch && matchesStatus && matchesOrder;
            });

            this.sortUsers();
            this.currentPage = 1;
        },

        sortBy(field) {
            if (this.sortField === field) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortDirection = 'asc';
            }
            this.sortUsers();
        },

        sortUsers() {
            this.filteredUsers.sort((a, b) => {
                let aVal = a[this.sortField];
                let bVal = b[this.sortField];

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (this.sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        },

        get paginatedUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        }
        ,

        get totalPages() {
            return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        }
        ,

        get visiblePages() {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];

            for (let i = Math.max(2, this.currentPage - delta);
                 i <= Math.min(this.totalPages - 1, this.currentPage + delta);
                 i++) {
                range.push(i);
            }

            if (this.currentPage - delta > 2) {
                rangeWithDots.push(1, '...');
            } else {
                rangeWithDots.push(1);
            }

            rangeWithDots.push(...range);

            if (this.currentPage + delta < this.totalPages - 1) {
                rangeWithDots.push('...', this.totalPages);
            } else if (this.totalPages > 1) {
                rangeWithDots.push(this.totalPages);
            }

            return rangeWithDots.filter((v, i, a) => a.indexOf(v) === i && v <= this.totalPages);
        }
        ,

        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        }
        ,

        toggleAll(checked) {
            if (checked) {
                this.selectedUsers = this.paginatedUsers.map(user => user.id);
            } else {
                this.selectedUsers = [];
            }
        }
        ,

        toggleUser(userId, event) {
            if (event.target.checked) {
                if (!this.selectedUsers.includes(userId)) {
                    this.selectedUsers.push(userId);
                }
            } else {
                this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
            }
        }
        ,

        editUser(user) {
            const userForm = Alpine.store('userFormStore');
            if (userForm)
                userForm.openModal('edit', user)
        }
        ,

        viewUser(user) {
            const userForm = Alpine.store('userFormStore');
            if (userForm)
                userForm.openModal('view', user)
        }
        ,

        deleteUser(user) {
            if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                this.users = this.users.filter(u => u.id !== user.id);
                this.filterUsers();
            }
        }
        ,

        bulkAction(action) {
            if (this.selectedUsers.length === 0) {
                alert('Please select users first');
                return;
            }

            const selectedUserObjects = this.users.filter(u => this.selectedUsers.includes(u.id));

            switch (action) {
                case 'activate':
                    selectedUserObjects.forEach(user => user.status = 'active');
                    break;
                case 'deactivate':
                    selectedUserObjects.forEach(user => user.status = 'inactive');
                    break;
                case 'delete':
                    if (confirm(`Are you sure you want to delete ${this.selectedUsers.length} users?`)) {
                        this.users = this.users.filter(u => !this.selectedUsers.includes(u.id));
                    }
                    break;
            }

            this.selectedUsers = [];
            this.filterUsers();
        }
        ,


        sendBulkInvites() {
            if (this.selectedUsers.length === 0) {
                alert('Please select users to send invites to');
                return;
            }

            // Simulate sending invites
            alert(`Sent invites to ${this.selectedUsers.length} users`);
            this.selectedUsers = [];
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

        userGrowthData(period = 'week') {
            const today = new Date();
            const counts = {};

            // Tạo dictionary {yyyy-mm-dd: số user mới}
            this.users.forEach(user => {
                if (!user.joinDate) return;
                const d = new Date(user.joinDate);
                if (isNaN(d)) return;
                const dayStr = d.toISOString().slice(0, 10);
                counts[dayStr] = (counts[dayStr] || 0) + 1;
            });

            let ranges = [];
            const labels = [];
            const data = [];

            switch (period) {
                case 'today': {
                    const start = new Date(today);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    ranges.push({start, end});
                    labels.push(start.toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                    }));
                    break;
                }
                case 'week': {
                    const dayOfWeek = today.getDay() || 7;
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday
                    for (let i = 0; i < 7; i++) {
                        const day = new Date(startOfWeek);
                        day.setDate(startOfWeek.getDate() + i);
                        ranges.push({start: day, end: day});
                    }
                    break;
                }
                case 'month': {
                    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                    for (let i = 1; i <= daysInMonth; i++) {
                        const day = new Date(today.getFullYear(), today.getMonth(), i);
                        ranges.push({start: day, end: day});
                    }
                    break;
                }
                case 'quarter': {
                    const quarter = Math.floor(today.getMonth() / 3);
                    for (let i = 0; i < 3; i++) {
                        const monthIndex = quarter * 3 + i;
                        const monthStart = new Date(today.getFullYear(), monthIndex, 1);
                        const monthEnd = new Date(today.getFullYear(), monthIndex + 1, 0);
                        ranges.push({start: monthStart, end: monthEnd});
                    }
                    break;
                }
                case 'year': {
                    for (let i = 0; i < 12; i++) {
                        const monthStart = new Date(today.getFullYear(), i, 1);
                        const monthEnd = new Date(today.getFullYear(), i + 1, 0);
                        ranges.push({start: monthStart, end: monthEnd});
                    }
                    break;
                }
                default:
                    console.warn('Invalid period:', period);
                    return [];
            }

            // Tính dữ liệu theo ranges
            ranges.forEach(({start, end}) => {
                let sum = 0;
                if (period === 'week' || period === 'month') {
                    const dayStr = start.toISOString().slice(0, 10);
                    sum = counts[dayStr] || 0;
                    labels.push(period === 'week'
                        ? start.toLocaleDateString('en-US', {weekday: 'short'})
                        : `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}`
                    );
                } else {
                    let d = new Date(start);
                    while (d <= end) {
                        const dayStr = d.toISOString().slice(0, 10);
                        sum += counts[dayStr] || 0;
                        d.setDate(d.getDate() + 1);
                    }
                    labels.push(start.toLocaleString('en-US', {month: 'short'}));
                }
                data.push(sum);
            });

            return labels.map((label, idx) => ({
                label,
                newUsers: data[idx]
            }));
        }
        ,

        calculateUserStats(period = 'week') {
            const {startCurrent, endCurrent, startPrevious, endPrevious} = this.getPeriodRangeWithPrevious(period);
            const countInRange = (start, end) =>
                this.users.filter(u => {
                    const d = new Date(u.joinDate);
                    return !isNaN(d) && d >= start && d <= end;
                });

            const filterUserCurrent = countInRange(startCurrent, endCurrent);
            const filterUserPrevious = countInRange(startCurrent, endCurrent);

            const newCurrent = filterUserCurrent.length;
            const newPrevious = filterUserPrevious.length;
            const activeCurrent = filterUserCurrent.filter(u => u.status === 'active').length;
            const inactiveCurrent = filterUserCurrent.filter(u => u.status === 'inactive').length;
            const growthPercentage = newPrevious === 0 ? (newCurrent > 0 ? 100 : 0) : ((newCurrent - newPrevious) / newPrevious) * 100;

            this.userStats.newUsers = newCurrent;
            this.growthPercentage = parseFloat(growthPercentage.toFixed(2));
            this.userStats.active = activeCurrent;
            this.userStats.inactive = inactiveCurrent

        }
        ,

        get departmentStats() {
            const counts = this.users.reduce((acc, user) => {
                acc[user.department] = (acc[user.department] || 0) + 1;
                return acc;
            }, {});

            const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

            return Object.entries(counts).map(([name, count], index) => ({
                name,
                count,
                percentage: this.users.length > 0 ? Math.round((count / this.users.length) * 100) : 0,
                color: colors[index % colors.length]
            }));
        }
        ,

        get systemAlerts() {
            return [
                {
                    id: 1,
                    title: 'User Registration Alert',
                    message: 'New user registrations require approval',
                    type: 'warning',
                    time: '5 minutes ago'
                },
                {
                    id: 2,
                    title: 'Backup Complete',
                    message: 'System backup completed successfully',
                    type: 'success',
                    time: '1 hour ago'
                },
                {
                    id: 3,
                    title: 'Maintenance Notice',
                    message: 'Database maintenance scheduled for tonight',
                    type: 'info',
                    time: '2 hours ago'
                }
            ];
        }
        ,

        initUserGrowthChart() {
            const theme = Alpine.store('themeStoreSwitch').currentTheme;
            const userGrowthChartEl = document.querySelector('#userGrowthChart');

            if (!this.userGrowth || this.userGrowth.length === 0) {
                console.warn("No user growth data available");
                return;
            }
            const data = this.userGrowth.map(stats => stats.newUsers) ?? []
            const label = this.userGrowth.map(stats => stats.label) ?? [];
            const options = {
                series: [{
                    name: 'New Users',
                    data: data
                }],
                chart: {
                    type: 'bar',
                    height: 350,
                    width: '100%',
                    toolbar: {show: false}
                },
                responsive: [{
                    breakpoint: 768,
                    options: {chart: {height: 200}}
                }],
                colors: ['#6366f1'],
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        columnWidth: '50%',
                        barHeight: '70%'
                    }
                },
                xaxis: {
                    categories: label,
                    axisBorder: {show: false},
                    axisTicks: {show: false},
                    labels: {
                        style: {fontSize: '12px', colors: '#64748b'},
                        rotate: -45,
                        hideOverlappingLabels: true
                    }
                },
                yaxis: {
                    show: true,
                    labels: {style: {colors: '#64748b'}}
                },
                dataLabels: {
                    enabled: false,
                    style: {fontSize: '12px', colors: ['#000']}
                },
                tooltip: {theme: theme}
            };

            if (!this.userGrowthChart) {
                this.userGrowthChart = new ApexCharts(userGrowthChartEl, options);
                this.userGrowthChart.render();
            } else {
                this.userGrowthChart.updateOptions(options);
            }
        }
        ,

        initTopUserChart() {
            const theme = Alpine.store('themeStoreSwitch').currentTheme;
            const topUsersChartEl = document.querySelector('#topUsersChart');
            if (topUsersChartEl && !this.topUsersChart) {
                const topUsers = [...this.users]
                    .sort((a, b) => b.totalOrders - a.totalOrders)
                    .slice(0, 5);
                const colors = ['#f56565', '#ed64a6', '#63b3ed', '#48bb78', '#faf089'];
                const topUserOptions = {
                    chart: {
                        type: 'bar',
                        height: 350
                    },
                    series: [{
                        name: 'Số đơn hàng',
                        data: topUsers.map(u => u.totalOrders)
                    }],
                    xaxis: {
                        categories: topUsers.map(u => {
                            const parts = u.name.split(' ');
                            return parts[parts.length - 1];
                        }),
                        labels: {
                            show: true
                        }
                    },

                    colors: colors,
                    plotOptions: {
                        bar: {
                            columnWidth: '50%',
                            horizontal: false,
                            borderRadius: 6,
                            dataLabels: {
                                position: 'top'
                            }
                        }
                    },
                    dataLabels: {
                        enabled: false,
                        style: {
                            fontWeight: '600',
                            colors: ['#1a202c']
                        }
                    },
                    tooltip: {
                        theme: theme
                    }
                };


                this.topUsersChart = new ApexCharts(topUsersChartEl, topUserOptions);
                this.topUsersChart.render();

            }
        }
        ,

        initCharts() {
            this.initUserGrowthChart();
            this.initTopUserChart();
        }
        ,

        updatePeriod(period) {
            this.userGrowth = this.userGrowthData(period);
            this.calculateUserStats(period);
            this.initUserGrowthChart();
            this.period = period;
        }
        ,

        changeTheme(newTheme) {
            const theme = newTheme === 'dark' ? 'dark' : 'light';
            if (this.userGrowthChart) {
                this.userGrowthChart.updateOptions({
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

        exportData() {
            fetch('/admin/api/export-users', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    users: this.filteredUsers
                })
            })
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'users-export.csv';
                    a.click();
                });

        }
        ,

    }))
    ;

//Orders
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
            this.orderTrendsData = this.getOrderTrendsData(this.period);
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
                    this.calculateOrderStats();
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

//Products
    Alpine.data('productTable', () => ({
        products: [],
        filteredProducts: [],
        selectedProducts: [],
        categories: [],
        categoryStats: [],
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
        stats: {
            total: 0,
            inStock: 0,
            lowStock: 0,
            totalValue: 0
        },
        salesData: [],
        topSellersChart: null,
        topSellerData: [],
        period: 'week',


        init() {
            Alpine.store('productTableStore', this);
            this.loadDataProducts();
            this.loadCategories();
            this.calculateStats();
            this.initCharts();

        },

        loadDataProducts() {
            this.isLoading = true;
            fetch('/admin/api/products', {
                method: 'GET'
            })
                .then(response => response.json())
                .then(data => {
                    this.products = data.products;
                    this.salesData = data.sales_data;
                    this.topSellerData = this.getTopSellers(this.period)
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
                this.categories = data;
                data.forEach(cate => {
                    this.categoryColors[cate.name.toLowerCase()] = this.getRandomColor();
                });
                this.calculateStats();
            })
                .catch(err => {
                    console.error('Lỗi khi load danh mục:', err);
                });
        },

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

        getPeriodRange(period = 'week') {
            const today = new Date();
            let start, end = today;

            switch (period) {
                case'today': {
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

        getTopSellers(period = 'week') {
            const {start, end} = this.getPeriodRange(period);
            const filteredSales = this.salesData.filter(sale => {
                const d = new Date(sale.date);
                return !isNaN(d) && d >= start && d <= end;
            });

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
        },


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
            console.log(this.categoryStats);

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

        updatePeriod(period) {
            this.topSellerData = this.getTopSellers(period);
            this.initSalesChart();
            this.initCategoryChart();
            this.period = period;
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

        generateDataReport() {
            return this.products.map(product => {
                const seller = this.topSellerData.find(item => item.product_id === product.id);
                return {
                    ...product,
                    totalSold: seller ? seller.totalSold : 0
                };
            })
        },
        exportData() {
            const data = this.generateDataReport();

            fetch('/admin/api/export-products', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    products: data
                })
            })
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'products-export.csv';
                    a.click();
                });
        }
        ,
    }))

    ;

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
            Alpine.store("reportsComponentStore").changeTheme(this.currentTheme);
        },

        applyTheme() {
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        }
    }));
})
;