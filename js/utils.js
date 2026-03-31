/* ================================================
   UTILS - Utility Functions
   ================================================ */

const Utils = {
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  },

  formatCurrency(amount) {
    const settings = Store.getSettings();
    return `${settings.currency} ${Number(amount).toLocaleString('id-ID')}`;
  },

  formatCurrencyShort(amount) {
    const settings = Store.getSettings();
    let num = Number(amount);
    if (isNaN(num)) return `${settings.currency} 0`;

    if (num >= 1000000) {
      return `${settings.currency} ${(num / 1000000).toFixed(1).replace(/\.0$/, '').replace('.', ',')}jt`;
    } else if (num >= 1000) {
      return `${settings.currency} ${(num / 1000).toFixed(1).replace(/\.0$/, '').replace('.', ',')}k`;
    }
    return `${settings.currency} ${num}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  formatDateOnly(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  getAvatarColorIndex(name) {
    if (!name) return 0;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 8;
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  showConfirm(title, message, icon = '⚠️') {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirm');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-icon').textContent = icon;
      
      modal.classList.remove('hidden');
      
      const btnConfirm = document.getElementById('btn-confirm-action');
      const newBtn = btnConfirm.cloneNode(true);
      btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
      
      newBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        resolve(true);
      });

      modal.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', () => {
          modal.classList.add('hidden');
          resolve(false);
        }, { once: true });
      });
    });
  },

  getPlayerName(player) {
    if (!player) return 'Unknown';
    if (typeof player === 'string') {
      const member = Store.getMember(player);
      return member ? member.name : player;
    }
    return player.name || 'Unknown';
  },

  getTeamNames(team) {
    if (!team || !Array.isArray(team)) return 'Unknown';
    return team.map(p => Utils.getPlayerName(p)).join(' & ');
  },

  downloadFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
