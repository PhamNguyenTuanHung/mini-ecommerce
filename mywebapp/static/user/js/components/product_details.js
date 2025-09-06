document.addEventListener("DOMContentLoaded", function () {
    window.color = null;
    window.size = null;
    const productInfoEl = document.getElementById("product-info");
    if (!productInfoEl) {
        return;
    }
    const productId= productInfoEl.dataset.productId
    window.availableStock = 0;

    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) {
        window.size = sizeSelect.value;

    }

    const firstSwatch = document.querySelector('.color-swatches .swatch');
    if (firstSwatch) {
        window.color = firstSwatch.dataset.color;
        firstSwatch.classList.add('selected');
    }

    checkStock();

    document.querySelector('.color-swatches ul')?.addEventListener('click', function (e) {
        const swatch = e.target.closest('.swatch');
        if (swatch) {
            window.color = swatch.dataset.color;

            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            checkStock();
        }
    });

    sizeSelect?.addEventListener('change', function () {
        window.size = this.value;
        checkStock();
    });

    function checkStock() {
        if (window.size && window.color) {
            fetch(`/user/api/products/stock?product_id=${productId}&color=${encodeURIComponent(window.color)}&size=${encodeURIComponent(window.size)}`)
                .then(response => response.json())
                .then(data => {
                    const stockEl = document.getElementById('stock-display');
                    stockEl.textContent = data.quantity > 0
                        ? `Còn ${data.quantity} sản phẩm trong kho`
                        : 'Hết hàng';
                    window.availableStock = data.quantity;
                })
                .catch(err => {
                    console.error('Lỗi khi lấy dữ liệu tồn kho:', err);
                    const stockEl = document.getElementById('stock-display');
                    if (stockEl) stockEl.textContent = 'Lỗi khi lấy số lượng';
                });
        }
    }
});


