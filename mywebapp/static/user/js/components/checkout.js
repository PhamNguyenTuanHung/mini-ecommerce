$(document).ready(function () {
    const baseSubtotal = parseFloat($("#subtotal").text().replace(/,/g, ''));
    $("#discount-select").select2({
        placeholder: "Nhập hoặc chọn voucher...",
        allowClear: true,
        tags: true
    });

    $("#discount-select").on("change", async function () {
        let discountPercent = 0;
        let appliedCode = $(this).val();

        if (appliedCode) {
            const selectedOption = $(this).find("option:selected");
            const percentAttr = selectedOption.data("percent");

            if (percentAttr) {
                discountPercent = parseFloat(percentAttr);
            } else {
                // Nếu không có trong list => gọi API để check
                try {
                    const res = await fetch(`/user/api/coupon/${appliedCode}`);
                    const data = await res.json();
                    if (data.error) {
                        showToast("Mã giảm giá không hợp lệ!", 'danger');
                        appliedCode = "";
                    } else {
                        discountPercent = data.percent || 0;
                        appliedCode = data.code;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        }

        let discountAmount = baseSubtotal * (discountPercent / 100);
        let newTotal = baseSubtotal - discountAmount;

        $("#total").text(newTotal.toLocaleString("en-US") + " ₫");

        if (appliedCode) {
            $("#applied-voucher span").text(appliedCode);
            $("#applied-voucher").show();
        } else {
            $("#applied-voucher").hide();
        }
    });
});
