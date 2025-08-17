// ==========================================================================
// Icon Manager - Lightweight icon system with tree-shaking
// ==========================================================================

// Option 1: Bootstrap Icons (CSS-based, already included)
export class BootstrapIconManager {
  constructor() {
    this.prefix = 'bi';
    this.icons = new Map();
    this.loadCommonIcons();
  }

  loadCommonIcons() {
    // Pre-define commonly used icons for better performance
    this.icons.set('dashboard', 'bi-speedometer2');
    this.icons.set('users', 'bi-people');
    this.icons.set('analytics', 'bi-graph-up');
    this.icons.set('settings', 'bi-gear');
    this.icons.set('notifications', 'bi-bell');
    this.icons.set('search', 'bi-search');
    this.icons.set('menu', 'bi-list');
    this.icons.set('close', 'bi-x');
    this.icons.set('check', 'bi-check');
    this.icons.set('warning', 'bi-exclamation-triangle');
    this.icons.set('info', 'bi-info-circle');
    this.icons.set('success', 'bi-check-circle');
    this.icons.set('error', 'bi-x-circle');
    this.icons.set('arrow-up', 'bi-arrow-up');
    this.icons.set('arrow-down', 'bi-arrow-down');
    this.icons.set('plus', 'bi-plus');
    this.icons.set('edit', 'bi-pencil');
    this.icons.set('delete', 'bi-trash');
    this.icons.set('download', 'bi-download');
    this.icons.set('upload', 'bi-upload');
    this.icons.set('home', 'bi-house');
    this.icons.set('calendar', 'bi-calendar');
    this.icons.set('clock', 'bi-clock');
    this.icons.set('mail', 'bi-envelope');
    this.icons.set('phone', 'bi-telephone');
    this.icons.set('location', 'bi-geo-alt');
    this.icons.set('heart', 'bi-heart');
    this.icons.set('star', 'bi-star');
    this.icons.set('bookmark', 'bi-bookmark');
    this.icons.set('share', 'bi-share');
    this.icons.set('copy', 'bi-clipboard');
    this.icons.set('link', 'bi-link');
    this.icons.set('external', 'bi-box-arrow-up-right');
    this.icons.set('refresh', 'bi-arrow-clockwise');
    this.icons.set('filter', 'bi-funnel');
    this.icons.set('sort', 'bi-sort-down');
    this.icons.set('grid', 'bi-grid');
    this.icons.set('list', 'bi-list-ul');
    this.icons.set('image', 'bi-image');
    this.icons.set('file', 'bi-file-text');
    this.icons.set('folder', 'bi-folder');
    this.icons.set('eye', 'bi-eye');
    this.icons.set('eye-slash', 'bi-eye-slash');
    this.icons.set('lock', 'bi-lock');
    this.icons.set('unlock', 'bi-unlock');
    this.icons.set('user', 'bi-person');
    this.icons.set('team', 'bi-people');
    this.icons.set('crown', 'bi-crown');
    this.icons.set('shield', 'bi-shield-check');
  }

  get(iconName, fallback = 'bi-question-circle') {
    return this.icons.get(iconName) || fallback;
  }

  create(iconName, className = '', attributes = {}) {
    const iconClass = this.get(iconName);
    const element = document.createElement('i');
    element.className = `${iconClass} ${className}`.trim();
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    return element;
  }

  createSVG(iconName, size = 16, className = '') {
    // For future SVG-based icons if needed
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }

  preloadIcons(iconList) {
  iconList.forEach(name => {
    this.get(name);
  });
}
}
