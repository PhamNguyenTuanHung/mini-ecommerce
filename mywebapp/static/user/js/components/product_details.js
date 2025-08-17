document.addEventListener("DOMContentLoaded", function () {
    let selectedColor = null;
    let selectedSize = null;

    const productInfoEl = document.getElementById("product-info");
    if (!productInfoEl) {
        return;
    }

    const productId = productInfoEl.dataset.productId;
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    window.availableStock = 0;

    // --- Lấy size mặc định ngay khi load ---
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) {
        selectedSize = sizeSelect.value;
        if (addToCartBtn) addToCartBtn.dataset.size = selectedSize;
    }

    // --- Lấy màu mặc định hoặc chọn màu đầu tiên ---
    const firstSwatch = document.querySelector('.color-swatches .swatch');
    if (firstSwatch) {
        selectedColor = firstSwatch.dataset.color;
        firstSwatch.classList.add('selected');
        if (addToCartBtn) addToCartBtn.dataset.color = selectedColor;
    }

    updateStock();

    // --- Khi chọn màu ---
    document.querySelector('.color-swatches ul')?.addEventListener('click', function (e) {
        const swatch = e.target.closest('.swatch');
        if (swatch) {
            selectedColor = swatch.dataset.color;

            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');

            if (addToCartBtn) addToCartBtn.dataset.color = selectedColor;
            updateStock();
        }
    });

    // --- Khi đổi size ---
    sizeSelect?.addEventListener('change', function () {
        selectedSize = this.value;

        if (addToCartBtn) addToCartBtn.dataset.size = selectedSize;
        updateStock();
    });

    // --- Hàm lấy số lượng tồn kho ---
    function updateStock() {
        if (selectedColor && selectedSize) {
            fetch(`/user/api/products/stock?product_id=${productId}&color=${encodeURIComponent(selectedColor)}&size=${encodeURIComponent(selectedSize)}`)
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


