document.addEventListener("DOMContentLoaded", function () {
    window.color = null;
    window.size = null;
    const productInfoEl = document.getElementById("product-info");
    if (!productInfoEl) {
        return;
    }
    const productId= productInfoEl.dataset.productId
    window.availableStock = 0;


    // --- Lấy size mặc định ngay khi load ---
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) {
        window.size = sizeSelect.value;

    }

    // --- Lấy màu mặc định hoặc chọn màu đầu tiên ---
    const firstSwatch = document.querySelector('.color-swatches .swatch');
    if (firstSwatch) {
        window.color = firstSwatch.dataset.color;
        firstSwatch.classList.add('selected');
    }

    updateStock();

    // --- Khi chọn màu ---
    document.querySelector('.color-swatches ul')?.addEventListener('click', function (e) {
        const swatch = e.target.closest('.swatch');
        if (swatch) {
            window.color = swatch.dataset.color;

            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            updateStock();
        }
    });

    // --- Khi đổi size ---
    sizeSelect?.addEventListener('change', function () {
        window.size = this.value;
        updateStock();
    });

    // --- Hàm lấy số lượng tồn kho ---
    function updateStock() {
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
                    console.error('Fetch stock failed:', err);
                    const stockEl = document.getElementById('stock-display');
                    if (stockEl) stockEl.textContent = 'Lỗi khi lấy số lượng';
                });
        }
    }
});


