(function ($) {
    'use strict';
    $(window).on('load', function () {
        $('#preloader').fadeOut('slow', function () {
            $(this).remove();
        });
    });

    $('input[name=\'product-quantity\']').TouchSpin();

    window.showToast = function (message, type = 'success') {
        console.log(123);
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade in`;
        toast.innerHTML = `
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">&times;</button>
            ${message}
        `;
        container.appendChild(toast);
        setTimeout(() => {
            $(toast).fadeOut(() => toast.remove());
        }, 3000);
    };

})(jQuery);
