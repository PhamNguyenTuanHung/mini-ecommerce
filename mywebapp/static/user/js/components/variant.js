function openVariantSheet(id, name, price) {
    window._variantProductId = id;
    document.getElementById("variant-quantity").value = 1;

    const colorDiv = document.getElementById("variant-colors");
    const sizeDiv = document.getElementById("variant-sizes");

    colorDiv.innerHTML = "";
    sizeDiv.innerHTML = "";

    colors.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-dark";
        btn.innerText = c;
        btn.onclick = () => selectOption(btn, 'color');
        colorDiv.appendChild(btn);
    });

    sizes.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-dark";
        btn.innerText = s;
        btn.onclick = () => selectOption(btn, 'size');
        sizeDiv.appendChild(btn);
    });

    document.getElementById("variant-overlay").style.display = "block";
    document.getElementById("variant-sheet").classList.add("active");
}

function closeVariantSheet() {
    document.getElementById("variant-overlay").style.display = "none";
    document.getElementById("variant-sheet").classList.remove("active");
}

function selectOption(btn, type) {
    const container = btn.parentElement;
    Array.from(container.children).forEach(child => {
        child.classList.remove("btn-dark");
        child.classList.add("btn-outline-dark");
    });
    btn.classList.add("btn-dark");
    btn.classList.remove("btn-outline-dark");
}

function confirmVariant() {
    const selectedColor = document.querySelector("#variant-colors .btn-dark");
    const selectedSize = document.querySelector("#variant-sizes .btn-dark");
    const quantity = parseInt(document.getElementById("variant-quantity").value || 1);

    if (!selectedColor || !selectedSize) {
        showToast("Vui lòng chọn màu sắc và kích thước!");
        return;
    }

    const color = selectedColor.innerText;
    const size = selectedSize.innerText;

    addToCart(null, window._variantProductId, null, null, color, size, quantity);

    closeVariantSheet();
}


