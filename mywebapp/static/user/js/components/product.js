import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

window.Alpine = Alpine;

document.addEventListener('alpine:init', () => {
    Alpine.data("dataProducts", () => ({
            products: [],
            filteredProducts: [],
            selectedProducts: [],
            categories: [],
            brands: [],
            currentPage: 1,
            totalPages: 0,
            itemsPerPage: 12,
            searchQuery: '',
            categoryFilter: '',
            brandFilter: '',
            sortField: 'name',
            sortDirection: 'asc',
            ratingFilter: '',
            quantitySoldFilter: '',
            priceFilter: '',
            newFilter: '',
            sortOption: 'priceLowHigh',
            bestSeller: [],
            bestRating: [],
            newest: [],
            flashSale: [],
            swiperBestSeller: null,
            swiperBestRating: null,
            swiperNewest: null,
            swiperFlashSale: null,


            async init() {
                const path = window.location.pathname;
                if (path === '/shop') {
                    await this.loadProductsFromUrl();
                } else {
                    await this.loadDataProducts()
                }
                this.loadCategories();
                this.loadBrands();
                await this.loadBestSeller();
                await this.loadBestRating();
                await this.loadNewest();
                await this.loadFlashSale();
                this.filteredProducts = this.bestSeller;
                this.initSwiper();
            },

            async loadProductsFromUrl() {
                const params = new URLSearchParams(window.location.search);
                this.currentPage = parseInt(params.get('page')) || 1;
                this.searchQuery = params.get('kw') || '';
                this.categoryFilter = params.get('cate_id') || '';
                this.brandFilter = params.get('brand_id') || '';
                this.sortOption = params.get('sort_by') || '';
                await this.loadDataProducts();
            },

            async loadDataProducts() {
                const params = new URLSearchParams({
                    page: this.currentPage,
                    kw: this.searchQuery,
                    cate_id: this.categoryFilter,
                    brand_id: this.brandFilter,
                    sort_by: this.sortOption
                });

                const path = window.location.pathname;
                if (path === '/shop') {
                    const newUrl = `${window.location.pathname}?${params.toString()}`;
                    history.replaceState(null, '', newUrl);
                }


                await fetch(`/user/api/products?${params}`)
                    .then(res => res.json())
                    .then(data => {
                        this.products = data.products;
                        this.totalPages = data.total_pages;
                        this.currentPage = data.current_page;
                    });
            }
            ,
            initSwiper() {
                this.$nextTick(() => {
                    this.swiperNewest = new Swiper(this.$refs.swiperNewest.querySelector('.swiper'), {
                        slidesPerView: 6,
                        spaceBetween: 5,
                        navigation: {
                            nextEl: this.$refs.swiperNewest.querySelector('.swiper-button-next'),
                            prevEl: this.$refs.swiperNewest.querySelector('.swiper-button-prev'),
                        },
                        watchOverflow: true,
                        breakpoints: {
                            0: {slidesPerView: 1},
                            480: {slidesPerView: 2},
                            1024: {slidesPerView: 6},
                        },
                    });

                    this.swiperFlashSale = new Swiper(this.$refs.swiperFlashSale.querySelector('.swiper'), {
                        slidesPerView: 6,
                        spaceBetween: 5,
                        navigation: {
                            nextEl: this.$refs.swiperFlashSale.querySelector('.swiper-button-next'),
                            prevEl: this.$refs.swiperFlashSale.querySelector('.swiper-button-prev'),
                        },
                        watchOverflow: true,
                        breakpoints: {
                            0: {slidesPerView: 1},
                            480: {slidesPerView: 2},
                            1024: {slidesPerView: 6},
                        },
                    });

                    this.swiperBestSeller = new Swiper(this.$refs.swiperBestSeller.querySelector('.swiper'), {
                        slidesPerView: 6,
                        spaceBetween: 5,
                        navigation: {
                            nextEl: this.$refs.swiperBestSeller.querySelector('.swiper-button-next'),
                            prevEl: this.$refs.swiperBestSeller.querySelector('.swiper-button-prev'),
                        },
                        watchOverflow: true,
                        breakpoints: {
                            0: {slidesPerView: 1},
                            480: {slidesPerView: 2},
                            1024: {slidesPerView: 6},
                        },
                    });

                    this.swiperBestRating = new Swiper(this.$refs.swiperBestRating.querySelector('.swiper'), {
                        slidesPerView: 6,
                        spaceBetween: 5,
                        watchOverflow: true,
                        navigation: {
                            nextEl: this.$refs.swiperBestRating.querySelector('.swiper-button-next'),
                            prevEl: this.$refs.swiperBestRating.querySelector('.swiper-button-prev'),
                        },
                        breakpoints: {
                            0: {slidesPerView: 1},
                            480: {slidesPerView: 2},
                            1024: {slidesPerView: 6},
                        },
                    });
                });
            }
            ,


            updateSwiper() {
                this.$nextTick(() => {
                    console.log('Filtered products:', this.filteredProducts);
                    if (this.swiper) {
                        this.swiper.update();
                        console.log('Swiper updated!');
                    } else {
                        console.log('Swiper chưa init');
                    }
                });
            }
            ,

            loadCategories() {
                fetch('/user/api/categories', {
                        method: 'GET'
                    }
                ).then(res => res.json()
                ).then(data => {
                    this.categories = data;
                }).catch(err => {
                    console.error('Lỗi khi load danh mục:', err);
                });
            }
            ,

            loadBrands() {
                fetch('/user/api/brands', {
                        method: 'GET'
                    }
                ).then(res => res.json()
                ).then(data => {
                    this.brands = data;
                }).catch(err => {
                    console.error('Lỗi khi load thương hiệu:', err);
                });
            }
            ,


            async loadBestSeller() {
                if (this.bestSeller.length > 0) return;
                try {
                    const res = await fetch('/user/api/products/best-sellers');
                    const data = await res.json();
                    if (data) {
                        this.bestSeller = data;
                    }
                } catch (err) {
                    console.error('Fetch lỗi:', err);
                }
            }
            ,

            async loadBestRating() {
                if (this.bestRating.length > 0) return;

                try {
                    const res = await fetch('/user/api/products/best-rated');
                    const data = await res.json();
                    if (data) {
                        this.bestRating = data;
                        console.log('BestSeller:', this.filteredProducts);
                    }
                } catch (err) {
                    console.error('Fetch lỗi:', err);
                }
            }
            ,
            async loadNewest() {
                if (this.newest.length > 0) return;
                try {
                    const res = await fetch('/user/api/products/newest');
                    const data = await res.json();
                    if (data) {
                        this.newest = data;
                        console.log('BestSeller:', this.filteredProducts);
                    }
                } catch (err) {
                    console.error('Fetch lỗi:', err);
                }
            }
            ,

            async loadFlashSale() {
                if (this.flashSale.length > 0) return;
                try {
                    const res = await fetch('/user/api/products/flash-sales');
                    const data = await res.json();
                    if (data) {
                        this.flashSale = data;
                    }
                } catch (err) {
                    console.error('Fetch lỗi:', err);
                }
            }
            ,
            async filterProducts() {
                this.currentPage = 1;
                await this.loadDataProducts();
            },


            // filterProducts() {
            //     this.filteredProducts = this.products.filter(product => {
            //         const matchesSearch = !this.searchQuery || product.name.toLowerCase().includes(this.searchQuery.toLowerCase());
            //         const matchesCategory = !this.categoryFilter || (product.category && product.category.name === this.categoryFilter);
            //         const matchesBrand = !this.brandFilter || (product.brand && product.brand.name === this.brandFilter);
            //         return matchesSearch && matchesCategory && matchesBrand;
            //     });
            //     switch (this.sortOption) {
            //         case 'priceLowHigh':
            //             this.filteredProducts.sort((a, b) => a.price - b.price);
            //             break;
            //         case 'priceHighLow':
            //             this.filteredProducts.sort((a, b) => b.price - a.price);
            //             break;
            //         case 'newest':
            //             this.filteredProducts.sort((a, b) => b.product_id - a.product_id);
            //             break;
            //         case 'bestseller':
            //             this.filteredProducts.sort((a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0));
            //             break;
            //         // case 'discount':
            //         //     // giả sử có trường product.discountPercent
            //         //     this.filteredProducts.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
            //         //     break;
            //         default:
            //             break;
            //     }
            //     this.sortProducts();
            //     this.currentPage = 1;
            // }
            // ,

            sortProducts() {
                this.filteredProducts.sort((a, b) => {
                        let aVal = a[this.sortField];
                        let bVal = b[this.sortField];

                        if (this.sortField === 'price') {
                            aVal = parseFloat(aVal);
                            bVal = parseFloat(bVal);
                        } else {
                            aVal = aVal.toString().toLowerCase();
                            bVal = bVal.toString().toLowerCase();
                        }

                        if (this.sortDirection === 'asc') {
                            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                        } else {
                            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                        }
                    }
                )
                ;
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

            get paginatedProducts() {
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = start + this.itemsPerPage;
                return this.filteredProducts.slice(start, end);
            }
            ,

            // get totalPages() {
            //     return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
            // }
            // ,

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

            async goToPage(page) {
                if (page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    await this.loadDataProducts();
                }
            }
            ,
        })
    )
    ;
})
;
$('.filter__controls li').on('click', function () {
    $('.filter__controls li').removeClass('active');
    $(this).addClass('active');
});