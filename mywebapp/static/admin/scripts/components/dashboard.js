document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
            charts: new Map(),
            users: [],
            orders: [],
            statusStats: [],
            revenue: [],
            stats: {
                total: 0,
                pending: 0,
                processing: 0,
                shipping: 0,
                delivered: 0,
                cancelled: 0,
                revenue: 0
            },
            orderComparison: 0,
            revenueMonthComparison: 0,
            userComparison: 0,
            userGrowth: [],
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
            recentActivities: [],
            revenueComparison: 0,


            async init() {
                await this.loadDashboardData();
                this.initRevenueChart();
                this.initUserGrowthChart();
                this.initOrderStatusChart();
                this.initStorageChart();
                this.initInteractiveElements();
                this.getRecentActivities();
                this.orderComparison = this.compareOrderCountWithLastMonth();
                this.revenueMonthComparison = this.compareRevenueWithLastMonth();
                this.userComparison = this.compareUserLastMonth();
                this.revenueComparison = this.compareRevenueWithYesterday();
            }
            ,

            async loadDashboardData() {
                await this.userData();
                await this.orderData();
                await this.recentOrders;
                this.revenue = this.revenueData();
            }
            ,
            async orderData() {
                await fetch('/admin/api/orders', {
                    method: "GET"
                })
                    .then(res => res.json())
                    .then(data => {
                        this.orders = data;
                        this.calculateStats();

                    })
                    .catch(error => {
                        console.error('Lỗi khi load đơn hàng:', error);
                    });
            }
            ,

            async userData() {
                await fetch('/admin/api/users', {
                    method: "GET"
                })
                    .then(res => res.json())
                    .then(data => {
                        this.users = data;
                    })
                    .catch(error => {
                        console.error('Lỗi khi load users:', error);
                    });
            },

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

            userGrowthData(daysCount = 7) {
                const today = new Date();

                if (daysCount === 365) {
                    const months = Array.from({length: 12}, (_, i) => i);

                    const counts = {};

                    this.users.forEach(user => {
                        if (!user.joinDate) return;
                        const d = new Date(user.joinDate);
                        if (isNaN(d)) return;

                        const month = d.getMonth();
                        const year = d.getFullYear();

                        // Lọc năm hiện tại
                        if (year === today.getFullYear()) {
                            counts[month] = (counts[month] || 0) + 1;
                        }
                    });

                    return months.map(month => ({
                        label: new Date(0, month).toLocaleString('en-US', {month: 'short'}), // Jan, Feb...
                        newUsers: counts[month] || 0
                    }));
                } else {
                    // Lấy theo ngày (7 hoặc 30 ngày)
                    const days = Array.from({length: daysCount}, (_, i) => {
                        const d = new Date(today);
                        d.setDate(d.getDate() - (daysCount - 1 - i));
                        return d;
                    });

                    const counts = {};

                    this.users.forEach(user => {
                        if (!user.joinDate) return;
                        const d = new Date(user.joinDate);
                        if (isNaN(d)) return;

                        const dayStr = d.toISOString().slice(0, 10);
                        counts[dayStr] = (counts[dayStr] || 0) + 1;
                    });

                    return days.map(d => {
                        const dayStr = d.toISOString().slice(0, 10);
                        let label = '';
                        if (daysCount === 7) {
                            // Hiển thị thứ (Mon, Tue, ...)
                            label = d.toLocaleDateString('en-US', {weekday: 'short'});
                        } else {
                            // Hiển thị dd/mm (vd: 01/08)
                            const day = d.getDate().toString().padStart(2, '0');
                            const month = (d.getMonth() + 1).toString().padStart(2, '0');
                            label = `${day}/${month}`;
                        }
                        return {
                            label,
                            newUsers: counts[dayStr] || 0
                        };
                    });
                }
            }
            ,

            calculateStats() {
                this.stats.total = this.orders.length;
                this.stats.processing = this.orders.filter(o => o.status === 'processing').length;
                this.stats.pending = this.orders.filter(o => o.status === 'pending').length;
                this.stats.shipping = this.orders.filter(o => o.status === 'shipping').length;
                this.stats.delivered = this.orders.filter(o => o.status === 'delivered').length;
                this.stats.cancelled = this.orders.filter(o => o.status === 'cancelled').length;
                this.stats.revenue = this.orders
                    .filter(o => o.status !== 'cancelled')
                    .reduce((sum, o) => sum + o.total, 0);

                const statuses = {};
                this.orders.forEach(order => {
                    statuses[order.status] = (statuses[order.status] || 0) + 1;
                });

                this.statusStats = Object.entries(statuses).map(([name, count]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    count,
                }));
            },

            get recentOrders() {
                if (!this.orders || this.orders.length === 0) return [];

                return this.orders
                    .slice(0, 5)
                    .map(order => ({
                        id: order.id,
                        customer: order.customer?.name || 'Unknown',
                        total: `$${parseFloat(order.total).toFixed(2)}`,
                        status: order.status,
                        date: new Date(order.orderDate).toLocaleDateString(),
                    }));
            },

            getRecentActivities() {
                fetch('/admin/api/system-logs', {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then(res => res.json())
                    .then(data => {
                        this.recentActivities = data;
                        console.log(this.recentActivities)
                    })
            },


            performanceData() {
                const hours = Array.from({length: 24}, (_, i) => i);
                return hours.map(hour => ({
                    hour: `${hour.toString().padStart(2, '0')}:00`,
                    responseTime: Math.random() * 2 + 0.5,
                    requests: Math.floor(Math.random() * 1000) + 100
                }));
            }
            ,
            compareUserLastMonth() {
                const now = new Date();
                const currentMonth = now.getMonth();  // 0-11
                const currentYear = now.getFullYear();

                let prevMonth = currentMonth - 1;
                let prevYear = currentYear;
                if (prevMonth < 0) {
                    prevMonth = 11;
                    prevYear -= 1;
                }

                const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
                const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);

                const userCurrentMonth = this.users.filter(user => {
                    const d = new Date(user.joinDate);
                    return d <= endOfCurrentMonth;
                }).length;

                const userPrevMonth = this.users.filter(user => {
                    const d = new Date(user.joinDate);
                    return d <= endOfPrevMonth;
                }).length;

                let percentChange = 0;
                if (userPrevMonth === 0) {
                    percentChange = userCurrentMonth > 0 ? 100 : 0;
                } else {
                    percentChange = ((userCurrentMonth - userPrevMonth) / userPrevMonth) * 100;
                }
                percentChange = Number(percentChange.toFixed(2));
                return {
                    currentMonth: userCurrentMonth,
                    previousMonth: userPrevMonth,
                    percentChange
                };
            },

            compareOrderCountWithLastMonth() {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let prevMonth = currentMonth - 1;
                let prevYear = currentYear;
                if (prevMonth < 0) {
                    prevMonth = 11;
                    prevYear -= 1;
                }

                const countCurrentMonth = this.orders.filter(order => {
                    const d = new Date(order.orderDate);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                }).length;

                const countPrevMonth = this.orders.filter(order => {
                    const d = new Date(order.orderDate);
                    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
                }).length;

                let percentChange = null;
                if (countPrevMonth === 0) {
                    if (countCurrentMonth > 0) {
                        percentChange = 100;
                    } else {
                        percentChange = 0;
                    }
                } else {
                    percentChange = ((countCurrentMonth - countPrevMonth) / countPrevMonth) * 100;
                    percentChange = Number(percentChange.toFixed(2));
                }

                return {
                    currentMonth: countCurrentMonth,
                    previousMonth: countPrevMonth,
                    percentChange
                };
            },

            compareRevenueWithLastMonth() {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let prevMonth = currentMonth - 1;
                let prevYear = currentYear;
                if (prevMonth < 0) {
                    prevMonth = 11;
                    prevYear -= 1;
                }

                const revenueCurrentMonth = this.orders.reduce((sum, order) => {
                    const d = new Date(order.orderDate);
                    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                        return sum + (Number(order.total) || 0);
                    }
                    return sum;
                }, 0);

                const revenuePrevMonth = this.orders.reduce((sum, order) => {
                    const d = new Date(order.orderDate);
                    if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
                        return sum + (Number(order.total) || 0);
                    }
                    return sum;
                }, 0);

                let percentChange = null;
                if (revenuePrevMonth === 0) {
                    if (revenueCurrentMonth > 0) {
                        percentChange = 100; // hoặc Infinity tùy ý bạn
                    } else {
                        percentChange = 0;
                    }
                } else {
                    percentChange = ((revenueCurrentMonth - revenuePrevMonth) / revenuePrevMonth) * 100;
                    percentChange = Number(percentChange.toFixed(2));

                }

                return {
                    currentMonth: revenueCurrentMonth,
                    previousMonth: revenuePrevMonth,
                    percentChange
                };
            },

            compareRevenueWithYesterday() {
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
                const revenueYesterday = this.orders.reduce((sum, order) => {
                    const d = new Date(order.orderDate);
                    if (d.getDate() === yesterday.getDate() &&
                        d.getMonth() === yesterday.getMonth() &&
                        d.getFullYear() === yesterday.getFullYear()) {
                        return sum + (Number(order.total) || 0);
                    }
                    return sum;
                }, 0);

                const percentChange = revenueYesterday === 0
                    ? (revenueToday > 0 ? 100 : 0)
                    : Number(((revenueToday - revenueYesterday) / revenueYesterday * 100).toFixed(2));

                return {
                    today: revenueToday,
                    yesterday: revenueYesterday,
                    percentChange
                };
            },

            revenueData() {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const revenueByMonth = [];
                for (let i = 0; i < 12; i++)
                    revenueByMonth[i] = 0;
                this.orders.forEach(order => {
                    const date = new Date(order.orderDate);
                    const monthIndex = date.getMonth();
                    revenueByMonth[monthIndex] += Number(order.total) || 0;
                })
                return months.map((month, index) => ({
                        month,
                        revenue: revenueByMonth[index]
                    }
                ));
            }
            ,

            initRevenueChart() {
                const ctx = document.getElementById('revenueChart');
                if (!ctx) return;

                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: this.revenue.map(item => item.month),
                        datasets: [
                            {
                                label: 'Revenue',
                                data: this.revenue.map(item => item.revenue),
                                borderColor: 'rgb(99, 102, 241)',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: 'rgb(99, 102, 241)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1,
                                cornerRadius: 8,
                                displayColors: true,
                                callbacks: {
                                    label: function (context) {
                                        return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                border: {
                                    display: false
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                },
                                border: {
                                    display: false
                                },
                                ticks: {
                                    callback: function (value) {
                                        return '$' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });

                this.charts.set('revenue', chart);
            }
            ,

            initUserGrowthChart() {
                const ctx = document.getElementById('userGrowthChart');
                if (!ctx) return;

                // Nếu đã có chart userGrowth thì destroy để tạo mới (nếu bạn cần)
                const oldChart = this.charts.get('userGrowth');
                if (oldChart) oldChart.destroy();
                this.userGrowth = this.userGrowthData(7)

                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: this.userGrowth.map(stat => stat.label),

                        datasets: [{
                            label: 'New Users',
                            data: this.userGrowth.map(stat => stat.newUsers),
                            backgroundColor: 'rgba(99, 102, 241, 0.8)',
                            borderColor: 'rgb(99, 102, 241)',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {display: false}
                        },
                        scales: {
                            x: {grid: {display: false}},
                            y: {
                                beginAtZero: true,
                                grid: {color: 'rgba(0, 0, 0, 0.1)'}
                            }
                        }
                    }
                });

                this.charts.set('userGrowth', chart);
            }
            ,

            initOrderStatusChart() {
                const ctx = document.getElementById('orderStatusChart');
                if (!ctx) return;

                const chart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: this.statusStats.map(stat => stat.name),
                        datasets: [{
                            data: this.statusStats.map(stat => stat.count),
                            backgroundColor: [
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(11,210,245,0.8)',
                                'rgba(107, 114, 128, 0.8)'
                            ],
                            borderWidth: 0,
                            cutout: '60%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });

                this.charts.set('orderStatus', chart);
            }
            ,

            initStorageChart() {
                const options = {
                    chart: {
                        height: 280,
                        type: "radialBar",
                    },
                    series: [76],
                    colors: ["#20E647"],
                    plotOptions: {
                        radialBar: {
                            hollow: {
                                margin: 0,
                                size: "70%",
                                background: "#293450"
                            },
                            track: {
                                dropShadow: {
                                    enabled: true,
                                    top: 2,
                                    left: 0,
                                    blur: 4,
                                    opacity: 0.15
                                }
                            },
                            dataLabels: {
                                name: {
                                    offsetY: -10,
                                    color: "#fff",
                                    fontSize: "13px"
                                },
                                value: {
                                    color: "#fff",
                                    fontSize: "30px",
                                    show: true
                                }
                            }
                        }
                    },
                    fill: {
                        type: "gradient",
                        gradient: {
                            shade: "dark",
                            type: "vertical",
                            gradientToColors: ["#87D4F9"],
                            stops: [0, 100]
                        }
                    },
                    stroke: {
                        lineCap: "round"
                    },
                    labels: ["Used Space"]
                };

                const chart = new ApexCharts(document.querySelector("#storageStatusChart"), options);
                chart.render();
                this.charts.set('storage', chart);
            }
            ,

            initInteractiveElements() {
                // Chart period switcher
                document.addEventListener('click', (e) => {
                    if (e.target.matches('[data-chart-period]')) {
                        const period = e.target.dataset.chartPeriod;
                        this.updateChartPeriod(period);

                        // Update active state
                        document.querySelectorAll('[data-chart-period]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        e.target.classList.add('active');
                    }
                });

                document.addEventListener('click', (e) => {
                    if (e.target.matches('[data-export-chart]')) {
                        const chartName = e.target.dataset.exportChart;
                        this.exportChart(chartName);
                    }
                });
            }
            ,

            updateChartPeriod(period) {
                this.period = period

            }
            ,
            exportChart(chartName) {
                const chart = this.charts.get(chartName);
                if (chart) {
                    const url = chart.toBase64Image();
                    const link = document.createElement('a');
                    link.download = `${chartName}-chart.png`;
                    link.href = url;
                    link.click();
                }
            }
            ,

            destroy() {
                this.charts.forEach(chart => chart.destroy());
                this.charts.clear();
            }
        })
    )
    ;
})
;
