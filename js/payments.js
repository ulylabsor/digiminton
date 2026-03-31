/* ================================================
   PAYMENTS - Payment Management (Daily Sessions)
   ================================================ */

const PaymentManager = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Filter events
    const filterName = document.getElementById('pay-filter-name');
    const filterDate = document.getElementById('pay-filter-date');
    if (filterName) filterName.addEventListener('input', () => this.renderListOnly());
    if (filterDate) {
      filterDate.addEventListener('change', () => this.renderListOnly());
      filterDate.addEventListener('input', () => this.renderListOnly());
    }
  },

  // State cache for fast filtering
  _currentBills: [],

  render() {
    const players = Store.getAllPlayers();
    const matches = Store.getCompletedMatches();
    const settings = Store.getSettings();
    const payments = Store.getPayments();

    // Default filter to today if empty, to immediately show today's bills
    const filterDateInput = document.getElementById('pay-filter-date');
    if (filterDateInput && !filterDateInput.value) {
      const today = new Date();
      const localDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      filterDateInput.value = localDateStr;
    }

    // Calculate daily bills
    this._currentBills = this.calculateDailyBills(players, matches, settings, payments);
    
    // Sort broadly by date descending, then player name
    this._currentBills.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return a.name.localeCompare(b.name);
    });

    this.renderListOnly();
  },

  renderListOnly() {
    const container = document.getElementById('payments-list');
    const filterNameInput = document.getElementById('pay-filter-name');
    const filterDateInput = document.getElementById('pay-filter-date');
    
    const kw = filterNameInput ? filterNameInput.value.toLowerCase() : '';
    const dFilter = filterDateInput ? filterDateInput.value : '';

    const filtered = this._currentBills.filter(b => {
      const matchName = b.name.toLowerCase().includes(kw);
      const matchDate = dFilter ? b.date === dFilter : true;
      return matchName && matchDate;
    });

    // Update summary based on the currently filtered view
    this.updateSummary(filtered);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">💰</span>
          <p>Belum ada tagihan sesuai filter</p>
        </div>
      `;
      return;
    }

    // Group by Date for UI
    const grouped = {};
    filtered.forEach(b => {
      if (!grouped[b.date]) grouped[b.date] = [];
      grouped[b.date].push(b);
    });

    // Determine the default expanded date
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultExpandedDate = dFilter || todayStr;

    let html = '';
    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(dateStr => {
      const isExpanded = dateStr === defaultExpandedDate;
      const contentClass = isExpanded ? 'date-group-content' : 'date-group-content hidden';
      const chevronRotation = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';

      // Date Header (Clickable)
      html += `
        <div class="date-group-header" 
             style="margin-top: 24px; margin-bottom: 12px; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-md); border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;"
             onclick="PaymentManager.toggleDateGroup('${dateStr}')">
          <h3 style="margin: 0; font-size: 16px;">🗓️ ${Utils.formatDateOnly(dateStr)}</h3>
          <span id="date-icon-${dateStr}" style="font-size: 14px; transition: transform 0.3s ease; transform: ${chevronRotation};">▼</span>
        </div>
        <div id="date-content-${dateStr}" class="${contentClass}">
      `;

      grouped[dateStr].forEach(p => {
        const isLunas = p.isLunas;
        html += `
          <div class="payment-card player-bill-card">
            <div class="payment-header no-cursor">
              <div class="payment-title-area">
                <div class="payment-title">${p.name}</div>
                <div class="payment-date" style="color:var(--text-secondary)">${p.matchCount} Pertandingan, ${p.scUsed} Bola</div>
              </div>
              <div style="text-align: right">
                <div class="payment-amount">${Utils.formatCurrencyShort(p.totalBill)}</div>
              </div>
            </div>
            
            <div class="payment-player-actions">
              <button class="status-badge ${isLunas ? 'status-paid' : 'status-unpaid'}" style="width: 100%; border:none; padding:12px; font-size:14px; cursor:pointer;"
                onclick="PaymentManager.toggleLunas('${p.playerId}', '${p.date}', ${p.totalBill}, ${isLunas})">
                ${isLunas ? '✅ Lunas' : '❌ Belum Lunas'}
              </button>
            </div>
          </div>
        `;
      });
      
      html += `</div>`; // Close date-group-content
    });

    container.innerHTML = html;
  },

  toggleDateGroup(dateStr) {
    const content = document.getElementById(`date-content-${dateStr}`);
    const icon = document.getElementById(`date-icon-${dateStr}`);
    if (!content) return;
    
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
      content.classList.add('hidden');
      if (icon) icon.style.transform = 'rotate(0deg)';
    }
  },

  calculateDailyBills(players, matches, settings, payments) {
    const playerDateMap = {}; // "playerId|YYYY-MM-DD" -> stats

    matches.forEach(m => {
      if (!m.date) return;
      
      // Get logical local date string handling past-midnight situations
      const mDate = new Date(m.date);
      const tzOffset = mDate.getTimezoneOffset() * 60000;
      const dateStr = new Date(mDate.getTime() - tzOffset).toISOString().split('T')[0];
      
      const addSc = (playerId) => {
        const key = `${playerId}|${dateStr}`;
        if (!playerDateMap[key]) {
          playerDateMap[key] = { scUsed: 0, matchCount: 0 };
        }
        playerDateMap[key].matchCount++;
        playerDateMap[key].scUsed += (m.shuttlecocksUsed || 0);
      };
      
      m.players.team1.forEach(p => addSc(p.id));
      m.players.team2.forEach(p => addSc(p.id));
    });

    const bills = [];
    Object.keys(playerDateMap).forEach(key => {
      const parts = key.split('|');
      const playerId = parts[0];
      const dateStr = parts[1];
      const stats = playerDateMap[key];
      
      const player = players.find(p => p.id === playerId);
      if (!player) return;
      
      const totalBill = stats.scUsed * settings.pricePerShuttlecock;
      
      // Determine if paid this specific date
      const isLunas = payments.some(pay => pay.playerId === playerId && pay.date === dateStr && pay.isPaid);

      bills.push({
        playerId,
        name: player.name,
        date: dateStr,
        matchCount: stats.matchCount,
        scUsed: stats.scUsed,
        totalBill,
        unpaidAmount: isLunas ? 0 : totalBill,
        isLunas
      });
    });

    return bills;
  },

  updateSummary(bills) {
    let total = 0;
    let paid = 0;
    let unpaid = 0;

    bills.forEach(p => {
      total += p.totalBill;
      if (p.isLunas) paid += p.totalBill;
      else unpaid += p.totalBill;
    });

    document.getElementById('pay-total').textContent = Utils.formatCurrencyShort(total);
    document.getElementById('pay-paid').textContent = Utils.formatCurrencyShort(paid);
    document.getElementById('pay-unpaid').textContent = Utils.formatCurrencyShort(unpaid);
  },

  toggleLunas(playerId, date, totalBill, isCurrentlyLunas) {
    if (totalBill === 0) return;
    
    if (isCurrentlyLunas) {
      // Find and delete the payment record
      const payments = Store.getPayments();
      const existing = payments.find(p => p.playerId === playerId && p.date === date && p.isPaid);
      if (existing) {
        Store.deletePayment(existing.id);
      }
    } else {
      // Add new payment record
      Store.addPayment({
        playerId,
        date,
        isPaid: true,
        amount: totalBill,
        timestamp: new Date().toISOString()
      });
    }
    
    this.render();
    
    if (typeof App !== 'undefined') {
      App.refreshDashboard(); 
    }
    
    Utils.showToast(
      isCurrentlyLunas ? 'Tagihan belum lunas' : 'Transaksi harian terlunasi ✅',
      isCurrentlyLunas ? 'info' : 'success'
    );
  }
};
