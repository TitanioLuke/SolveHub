// ===============================
//   TOAST NOTIFICATION SYSTEM
//   Sistema de notificações clean e profissional
//   ===============================

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.init();
  }

  init() {
    // Criar container se não existir
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Mostra um toast
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {string} message - Mensagem a mostrar
   * @param {string} title - Título (opcional)
   * @param {number} duration - Duração em ms (0 = não fecha automaticamente)
   * @returns {string} ID do toast
   */
  show(type, message, title = null, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = id;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    // Ícones SVG
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`
    };

    // Botão de fechar
    const closeBtn = `<button class="toast-close" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>`;

    // HTML do toast
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      ${closeBtn}
      ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    // Adicionar ao container
    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss
    if (duration > 0) {
      const progressBar = toast.querySelector('.toast-progress');
      if (progressBar) {
        progressBar.style.transitionDuration = `${duration}ms`;
        requestAnimationFrame(() => {
          progressBar.style.width = '100%';
        });
      }

      const timeout = setTimeout(() => {
        this.hide(id);
      }, duration);
      
      // Guardar timeout para poder cancelar
      toast._timeout = timeout;
    }

    // Event listener para fechar
    const closeButton = toast.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide(id);
      });
    }

    return id;
  }

  /**
   * Esconde um toast
   * @param {string} id - ID do toast
   */
  hide(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Cancelar timeout se existir
    if (toast._timeout) {
      clearTimeout(toast._timeout);
    }

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(id);
    }, 300);
  }

  /**
   * Esconde todos os toasts
   */
  hideAll() {
    this.toasts.forEach((_, id) => {
      this.hide(id);
    });
  }

  /**
   * Escape HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Instância global
const toastManager = new ToastManager();

// Funções de conveniência
window.toast = {
  success: (message, title = null, duration = 4000) => {
    return toastManager.show('success', message, title, duration);
  },
  error: (message, title = null, duration = 5000) => {
    return toastManager.show('error', message, title, duration);
  },
  warning: (message, title = null, duration = 4000) => {
    return toastManager.show('warning', message, title, duration);
  },
  info: (message, title = null, duration = 4000) => {
    return toastManager.show('info', message, title, duration);
  },
  hide: (id) => {
    toastManager.hide(id);
  },
  hideAll: () => {
    toastManager.hideAll();
  }
};
