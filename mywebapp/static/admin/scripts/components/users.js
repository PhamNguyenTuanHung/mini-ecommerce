document.addEventListener('alpine:init', () => {
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
        recentActivities: [],
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
        topUsersChart: null,
        userGrowthChart: null,
        userGrowth: [],


        async init() {
            Alpine.store("userTableStore", this);
            await this.loadDataUsers();
            this.getRecentActivities();
            this.initInteractiveElements();
            setInterval(() => this.getRecentActivities(), 10000);
            this.changeTheme('')
            document.dispatchEvent(new CustomEvent('userTableReady'))
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
                    this.userGrowth = this.userGrowthData(7);
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

        userGrowthData(daysCount = 7) {
            const today = new Date();

            if (daysCount === 365) {
                const counts = {};
                this.users.forEach(user => {
                    if (!user.joinDate) return;
                    const d = new Date(user.joinDate);
                    if (isNaN(d)) return;
                    if (d.getFullYear() === today.getFullYear()) {
                        counts[d.getMonth()] = (counts[d.getMonth()] || 0) + 1;
                    }
                });

                return Array.from({length: 12}, (_, month) => ({
                    label: new Date(0, month).toLocaleString('en-US', {month: 'short'}),
                    newUsers: counts[month] || 0
                }));
            }

            if (daysCount === 90) {
                const days = Array.from({length: 90}, (_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() - (89 - i));
                    return d;
                });

                const countsByDay = {};
                this.users.forEach(user => {
                    if (!user.joinDate) return;
                    const d = new Date(user.joinDate);
                    if (isNaN(d)) return;
                    const dayStr = d.toISOString().slice(0, 10);
                    countsByDay[dayStr] = (countsByDay[dayStr] || 0) + 1;
                });

                const labels = [];
                const data = [];
                for (let i = 0; i < 90; i += 7) {
                    const weekDays = days.slice(i, i + 7);
                    const weekLabel = `${weekDays[0].toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })} - ${weekDays[weekDays.length - 1].toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}`;

                    const weekSum = weekDays.reduce((sum, d) => {
                        const dayStr = d.toISOString().slice(0, 10);
                        return sum + (countsByDay[dayStr] || 0);
                    }, 0);

                    labels.push(weekLabel);
                    data.push(weekSum);
                }

                return labels.map((label, idx) => ({
                    label,
                    newUsers: data[idx]
                }));
            }

            const days = Array.from({length: daysCount}, (_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() - (daysCount - 1 - i));
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
                const label = daysCount === 7
                    ? d.toLocaleDateString('en-US', {weekday: 'short'})
                    : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

                return {
                    label,
                    newUsers: counts[dayStr] || 0
                };
            });
        }
        ,
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

        exportUsers() {
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

        generateCSV(users) {
            const headers = ['ID', 'Name', 'Email', 'Order', 'Status', 'totalOrders', 'Phone', 'Join Date', 'Last Active'];
            const rows = users.map(user => [
                user.id,
                user.name,
                user.email,
                user.role,
                user.status,
                user.totalOrders,
                user.phone,
                user.joinDate,
                user.lastActive
            ]);

            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        ,



        downloadCSV(content, filename) {
            const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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

        generateReport() {
            // Generate and download user report
            const reportData = {
                generatedAt: new Date().toISOString(),
                totalUsers: this.users.length,
                stats: this.stats,
                departmentBreakdown: this.departmentStats,
                recentActivity: this.recentActivities
            };

            const jsonContent = JSON.stringify(reportData, null, 2);
            this.downloadCSV(jsonContent, 'user-report.json');
        }
        ,

        get stats() {
            const active = this.users.filter(u => u.status === 'active').length;
            const inactive = this.users.filter(u => u.status === 'inactive').length;

            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();

            const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
            const lastMonth = lastMonthDate.getMonth();
            const lastYear = lastMonthDate.getFullYear();

            const newThisMonth = this.users.filter(u => {
                const joinDate = new Date(u.joinDate);
                return joinDate.getMonth() === thisMonth && joinDate.getFullYear() === thisYear;
            }).length;

            const newLastMonth = this.users.filter(u => {
                const joinDate = new Date(u.joinDate);
                return joinDate.getMonth() === lastMonth && joinDate.getFullYear() === lastYear;
            }).length;


            const growthPercentage = newLastMonth === 0
                ? (newThisMonth > 0 ? 100 : 0)
                : ((newThisMonth - newLastMonth) / newLastMonth) * 100;
            return {
                total: this.users.length,
                active,
                inactive,
                newThisMonth,
                newLastMonth,
                growthPercentage: parseFloat(growthPercentage.toFixed(2)),
                activePercentage: this.users.length > 0 ? (active / this.users.length) * 100 : 0,
                inactivePercentage: this.users.length > 0 ? (inactive / this.users.length) * 100 : 0,
            };
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
            const data = this.userGrowth.map(stats => stats.newUsers)
            const label = this.userGrowth.map(stats => stats.label);
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
            this.userGrowth = this.userGrowthData(daysCount);
            this.initUserGrowthChart();
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

    }))
    ;


    Alpine.data('userForm', () => ({
        form: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'user',
            status: 'active',
            username: '',
            password: '',
            avatarUrl: null,
            img: null
        },
        originalAvatar: null,
        userID: null,
        mode: null,
        init() {
            Alpine.store('userFormStore', this);
        },

        resetForm() {
            this.form.firstName = '';
            this.form.lastName = '';
            this.form.email = '';
            this.form.phone = '';
            this.form.role = 'user';
            this.form.status = 'active';
            this.form.username = '';
            this.form.password = '';
            this.form.confirmPassword = '';
            this.form.avatarUrl = null;
            this.originalAvatar = null;
            this.form.img = null
        },


        openModal(mode, user = null) {
            this.mode = mode;
            this.resetForm();
            if (user && mode !== 'add') {
                const nameParts = user.name.split(' ');
                this.form.firstName = nameParts[0] || '';
                this.form.lastName = nameParts.slice(1).join(' ') || '';
                this.form.email = user.email;
                this.form.role = user.role;
                this.form.status = user.status;
                this.form.phone = user.phone;
                this.userID = user.id;
                this.form.avatarUrl = user.avatar;
                this.originalAvatar = user.avatar;
            }
            new bootstrap.Modal(document.getElementById('userModal')).show();
        },

        validateForm(mode) {
            if (mode === 'add')
                if (!this.form.firstName || !this.form.lastName || !this.form.email || !this.form.username || !this.form.password) {
                    alert('Vui lòng nhập đầy đủ thông tin bắt buộc');
                    return false;
                }
            if (mode === 'edit')
                if (!this.form.firstName || !this.form.lastName || !this.form.email) {
                    alert('Vui lòng nhập đầy đủ thông tin bắt buộc');
                    return false;
                }
            return true;
        },

        saveUser() {
            if (!this.validateForm()) return;
            const isEdit = this.mode === 'edit';
            const formData = new FormData();
            formData.append('name', `${this.form.firstName} ${this.form.lastName}`);
            formData.append('email', this.form.email);
            formData.append('phone', this.form.phone);
            formData.append('role', this.form.role);
            formData.append('status', this.form.status === 'active' ? 1 : 0);

            if (this.form.img) {
                formData.append('avatar', this.form.img);
            } else if (this.form.avatarUrl !== this.originalAvatar) {
                formData.append('avatar_url', this.form.avatarUrl);
            }
            if (!isEdit) {
                formData.append('username', this.form.username);
                formData.append('password', this.form.password);
            }

            fetch(isEdit ? `/admin/api/users/${this.userID}` : '/admin/api/users', {
                method: isEdit ? 'PUT' : 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: isEdit ? 'Cập nhật người dùng thành công!' : 'Đã thêm người dùng!',
                            icon: 'success'
                        });

                        const userTable = Alpine.store("userTableStore");
                        if (userTable?.loadDataUsers) userTable.loadDataUsers();

                        this.resetForm();
                        bootstrap.Modal.getInstance(document.getElementById('userModal'))?.hide();
                    } else {
                        Swal.fire({title: 'Lỗi', text: data.message || 'Thao tác thất bại!', icon: 'error'});
                    }
                })
                .catch(err => {
                    console.error(err);
                    Swal.fire({
                        title: 'Lỗi hệ thống',
                        text: 'Không thể gửi dữ liệu. Vui lòng thử lại sau.',
                        icon: 'error'
                    });
                });
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
            Alpine.store("userTableStore").changeTheme(this.currentTheme);
        },

        applyTheme() {
            document.documentElement.setAttribute('data-bs-theme', this.currentTheme);
        }
    }));

    Alpine.data('searchComponent', () => ({
        query: '',
        results: [],
        isLoading: false,

        async search() {
            if (this.query.length < 2) {
                this.results = [];
                return;
            }

            this.isLoading = true;

            // Simulate API search
            await new Promise(resolve => setTimeout(resolve, 300));

            this.results = [
                {title: 'Dashboard', url: '/', type: 'page'},
                {title: 'Users', url: '/users.html', type: 'page'},
                {title: 'Settings', url: '/settings.html', type: 'page'},
                {title: 'Analytics', url: '/analytics.html', type: 'page'},
                {title: 'Security', url: '/security.html', type: 'page'},
                {title: 'Help', url: '/help.html', type: 'page'}
            ].filter(item =>
                item.title.toLowerCase().includes(this.query.toLowerCase())
            );

            // Also filter the user table if it exists on this page
            const userTable = Alpine.$data(document.querySelector('[x-data="userTable"]'));
            if (userTable) {
                userTable.searchQuery = this.query;
                userTable.filterUsers();
            }

            this.isLoading = false;
        }
    }));

    Alpine.data('userStats', () => ({
        user: {},
        summary: {orders: 0, logins: 0, totalSpent: 0},
        orderHistory: [],
        loginHistory: [],
        spendingHistory: [],

        async open(userId) {
            const res = await fetch(`admin/api/users/${userId}/stats`);
            const data = await res.json();
            this.user = data.user;
            this.summary = {
                orders: data.order_history.reduce((a, b) => a + b.orders, 0),
                logins: data.login_history.reduce((a, b) => a + b.logins, 0),
                totalSpent: data.total_spent
            };
            this.orderHistory = data.order_history;
            this.loginHistory = data.login_history;
            this.spendingHistory = data.order_history.map(o => ({
                date: o.date, amount: o.total_amount
            }));
            this.renderCharts();
            new bootstrap.Modal(document.getElementById('userStatsModal')).show();
        },

        renderCharts() {
            new Chart(document.getElementById('ordersChart'), {
                type: 'bar',
                data: {
                    labels: this.orderHistory.map(o => o.date),
                    datasets: [{
                        label: 'Số đơn',
                        data: this.orderHistory.map(o => o.orders),
                        backgroundColor: '#4e73df'
                    }]
                }
            });

            new Chart(document.getElementById('loginsChart'), {
                type: 'line',
                data: {
                    labels: this.loginHistory.map(o => o.date),
                    datasets: [{
                        label: 'Lượt đăng nhập',
                        data: this.loginHistory.map(o => o.logins),
                        borderColor: '#1cc88a'
                    }]
                }
            });

            new Chart(document.getElementById('spendingChart'), {
                type: 'line',
                data: {
                    labels: this.spendingHistory.map(o => o.date),
                    datasets: [{
                        label: 'Chi tiêu (₫)',
                        data: this.spendingHistory.map(o => o.amount),
                        borderColor: '#f6c23e',
                        fill: true
                    }]
                }
            });
        }
    }));

})
;