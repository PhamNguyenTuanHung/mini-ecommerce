
const Toast = window.bootstrap?.Toast;
const Swal = window.Swal

if (!Toast || !Swal) {
  console.error('⚠️ Bootstrap Toast hoặc SweetAlert2 chưa được tải đúng cách.');
}

export class NotificationManager {
  constructor() {
    this.Swal = Swal;
    this.Toast = Toast;

    this.container = document.getElementById('toast-container') || this.createToastContainer();
    this.defaultDuration = 5000;
    this.activeToasts = new Set();
    this.init();
  }

  init() {
    if (!this.container) {
      this.container = this.createToastContainer();
    }

    this.configureSweetAlert();
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1100'; // Tăng z-index đảm bảo toast nổi trên modal
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  configureSweetAlert() {
    this.Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-primary me-2',
        cancelButton: 'btn btn-secondary',
        popup: 'rounded-3 shadow-lg',
        title: 'fs-4 fw-bold',
        content: 'text-muted'
      },
      buttonsStyling: false,
      reverseButtons: true,
      focusConfirm: false,
      allowOutsideClick: true,
      allowEscapeKey: true,
      showCloseButton: true
    });
  }

  // Toast Notifications
  show(message, type = 'info', options = {}) {
    const config = {
      message,
      type,
      duration: options.duration || this.defaultDuration,
      persistent: options.persistent || false,
      action: options.action || null,
      icon: options.icon || this.getIconForType(type)
    };

    const toastEl = this.createToast(config);
    this.container.appendChild(toastEl);

    const bsToast = new this.Toast(toastEl, {
      autohide: !config.persistent,
      delay: config.duration
    });

    this.activeToasts.add(bsToast);

    toastEl.addEventListener('hidden.bs.toast', () => {
      this.activeToasts.delete(bsToast);
      toastEl.remove();
    });

    bsToast.show();
    return bsToast;
  }

  createToast(config) {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${config.type} border-0`;
    toast.id = toastId;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const closeButton = config.persistent ? '' : `
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    `;

    const actionButton = config.action ? `
      <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="${config.action.handler}">
        ${config.action.text}
      </button>
    ` : '';

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center">
          <i class="${config.icon} me-2"></i>
          <span class="flex-grow-1">${config.message}</span>
          ${actionButton}
        </div>
        ${closeButton}
      </div>
    `;

    return toast;
  }

  getIconForType(type) {
    const icons = {
      success: 'bi bi-check-circle-fill',
      error: 'bi bi-exclamation-triangle-fill',
      warning: 'bi bi-exclamation-triangle-fill',
      info: 'bi bi-info-circle-fill',
      primary: 'bi bi-info-circle-fill',
      secondary: 'bi bi-info-circle-fill',
      danger: 'bi bi-exclamation-triangle-fill',
      light: 'bi bi-info-circle-fill',
      dark: 'bi bi-info-circle-fill'
    };
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(msg, opt = {}) { return this.show(msg, 'success', opt); }
  error(msg, opt = {}) { return this.show(msg, 'danger', opt); }
  warning(msg, opt = {}) { return this.show(msg, 'warning', opt); }
  info(msg, opt = {}) { return this.show(msg, 'info', opt); }

  // SweetAlert2
  async confirm(opt = {}) {
    const defaults = {
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel'
    };
    const result = await this.Swal.fire({ ...defaults, ...opt });
    return result.isConfirmed;
  }

  async prompt(opt = {}) {
    const defaults = {
      title: 'Enter value',
      input: 'text',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      inputValidator: (v) => (!v ? 'Please enter a value' : null)
    };
    const result = await this.Swal.fire({ ...defaults, ...opt });
    return result.isConfirmed ? result.value : null;
  }

  async alert(message, type = 'info', title = '') {
    const icon = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
    await this.Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText: 'OK'
    });
  }

  async showLoading(msg = 'Loading...') {
    this.Swal.fire({
      title: msg,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      willOpen: () => {
        this.Swal.showLoading();
      }
    });
  }

  hideLoading() {
    this.Swal.close();
  }

  async showProgress(title, onProgress) {
    await this.Swal.fire({
      title,
      html: `
        <div class="progress mb-3">
          <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div id="progress-text">Starting...</div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        const progressBar = this.Swal.getHtmlContainer().querySelector('.progress-bar');
        const progressText = this.Swal.getHtmlContainer().querySelector('#progress-text');
        if (onProgress) {
          onProgress((step, text) => {
            progressBar.style.width = `${step}%`;
            progressBar.setAttribute('aria-valuenow', step);
            if (text) progressText.textContent = text;
            if (step >= 100) {
              setTimeout(() => {
                this.Swal.close();
                this.success('Operation completed successfully!');
              }, 500);
            }
          });
        }
      }
    });
  }

  clearAll() {
    this.activeToasts.forEach(t => t.hide());
    this.activeToasts.clear();
  }

  handleRealTimeNotification(data) {
    const { type, message, priority = 'normal', persistent = false } = data;
    const options = {
      persistent: priority === 'high' || persistent,
      duration: priority === 'high' ? 10000 : this.defaultDuration
    };
    if (priority === 'high') this.playNotificationSound();
    this.show(message, type, options);
  }

  playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2O/FeCkFKXnJ8N+PQAoSXrTp6qpTFAlEnt//wUfZBBmBzOvQDh8VHH/H7N4=');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }

  addToActivityFeed(notification) {
    const container = document.querySelector('.activity-feed');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon bg-${notification.type} bg-opacity-10 text-${notification.type}">
        <i class="${this.getIconForType(notification.type)}"></i>
      </div>
      <div class="activity-content">
        <p class="mb-1">${notification.message}</p>
        <small class="text-muted">Just now</small>
      </div>
    `;

    container.insertBefore(item, container.firstChild);
    const items = container.querySelectorAll('.activity-item');
    if (items.length > 10) items[items.length - 1].remove();
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const noti = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      setTimeout(() => noti.close(), 5000);
      return noti;
    }
  }
}
