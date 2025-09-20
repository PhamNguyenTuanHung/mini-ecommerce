export function showFlashes() {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const messages = JSON.parse(container.dataset.messages || '[]');

    messages.forEach(msg => {
        const category = msg[0];
        const message = msg[1];
        const toast = document.createElement('div');
        toast.className = `alert alert-${category} alert-dismissible`;
        toast.style.cssText = `
            min-width: 250px;
            margin-top: 10px;
            opacity: 1;
            transition: opacity 0.5s ease;
        `;
        toast.innerHTML = `
            <button type="button" class="close" data-dismiss="alert">&times;</button>
            ${message}
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', showFlashes);
