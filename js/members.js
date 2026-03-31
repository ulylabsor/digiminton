/* ================================================
   MEMBERS - Member Management
   ================================================ */

const MemberManager = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('btn-add-member').addEventListener('click', () => this.openModal());
    document.getElementById('btn-save-member').addEventListener('click', () => this.saveMember());
    
    document.getElementById('member-search').addEventListener('input', 
      Utils.debounce((e) => this.render(e.target.value), 200)
    );

    // Close modal
    document.querySelectorAll('[data-close="modal-member"]').forEach(el => {
      el.addEventListener('click', () => this.closeModal());
    });
  },

  render(filter = '') {
    const container = document.getElementById('members-list');
    let members = Store.getMembers();

    if (filter) {
      const q = filter.toLowerCase();
      members = members.filter(m => m.name.toLowerCase().includes(q));
    }

    document.getElementById('member-count').textContent = `${members.length} Member`;

    if (members.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <p>${filter ? 'Tidak ditemukan' : 'Belum ada member'}</p>
          <p class="empty-sub">${filter ? 'Coba kata kunci lain' : 'Tap "Tambah" untuk menambah member baru'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = members.map(member => {
      const stats = Store.getMemberStats(member.id);
      const colorIdx = Utils.getAvatarColorIndex(member.name);
      const initials = Utils.getInitials(member.name);
      const isInactive = member.isActive === false;

      return `
        <div class="member-card ${isInactive ? 'inactive' : ''}" data-id="${member.id}">
          <div class="member-avatar avatar-color-${colorIdx}">
            ${initials}
            ${member.isGuest ? '<span class="guest-badge">G</span>' : ''}
          </div>
          <div class="member-info">
            <div class="member-name">
              ${member.name}
              ${member.isGuest ? '<span class="badge-guest">Tamu</span>' : ''}
            </div>
            <div class="member-meta">
              ${member.phone ? member.phone : 'Bergabung ' + Utils.formatDate(member.joinDate)}
            </div>
            <div class="member-stats">
              <span class="member-stat-badge badge-win">W: ${stats.wins}</span>
              <span class="member-stat-badge badge-loss">L: ${stats.losses}</span>
              <span class="member-stat-badge badge-rate">${stats.winRate}%</span>
            </div>
          </div>
          <div class="member-actions">
            <button class="member-action-btn" onclick="MemberManager.openModal('${member.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="member-action-btn delete" onclick="MemberManager.deleteMember('${member.id}')" title="Hapus">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openModal(editId = null) {
    const modal = document.getElementById('modal-member');
    const title = document.getElementById('modal-member-title');
    
    document.getElementById('member-edit-id').value = '';
    document.getElementById('member-name').value = '';
    document.getElementById('member-phone').value = '';
    document.getElementById('member-active').checked = true;

    if (editId) {
      const member = Store.getMember(editId);
      if (member) {
        title.textContent = 'Edit Member';
        document.getElementById('member-edit-id').value = editId;
        document.getElementById('member-name').value = member.name;
        document.getElementById('member-phone').value = member.phone || '';
        document.getElementById('member-active').checked = member.isActive !== false;
      }
    } else {
      title.textContent = 'Tambah Member';
    }

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-member').classList.add('hidden');
  },

  saveMember() {
    const editId = document.getElementById('member-edit-id').value;
    const name = document.getElementById('member-name').value.trim();
    const phone = document.getElementById('member-phone').value.trim();
    const isActive = document.getElementById('member-active').checked;

    if (!name) {
      Utils.showToast('Nama harus diisi!', 'error');
      return;
    }

    if (editId) {
      Store.updateMember(editId, { name, phone, isActive });
      Utils.showToast('Member berhasil diupdate! ✅', 'success');
    } else {
      Store.addMember({ name, phone, isActive, isGuest: false });
      Utils.showToast('Member berhasil ditambahkan! 🎉', 'success');
    }

    this.closeModal();
    this.render();
    
    // Update selects in scoreboard
    Scoreboard.populatePlayerSelects();
  },

  async deleteMember(id) {
    const member = Store.getMember(id);
    if (!member) return;

    const confirmed = await Utils.showConfirm(
      'Hapus Member?',
      `Anda yakin ingin menghapus "${member.name}"?`,
      '🗑️'
    );

    if (confirmed) {
      Store.deleteMember(id);
      Utils.showToast('Member dihapus', 'info');
      this.render();
      Scoreboard.populatePlayerSelects();
    }
  }
};
