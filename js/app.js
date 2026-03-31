/* ================================================
   APP - Main Application Controller
   ================================================ */

const App = {
  currentPage: 'dashboard',

  init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }

    // Initialize modules
    Scoreboard.init();
    MemberManager.init();
    PaymentManager.init();
    ReportManager.init();

    // Bind navigation
    this.bindNavigation();
    this.bindSwipe();
    this.bindSettings();
    this.bindTheme();

    // Load settings
    this.loadSettings();

    // Init Theme
    this.initTheme();

    // Show splash then app
    const settings = Store.getSettings();
    const splashTitle = document.querySelector('.splash-title');
    if (splashTitle && settings.clubName) {
      splashTitle.textContent = settings.clubName;
    }

    setTimeout(() => {
      document.getElementById('splash-screen').classList.add('fade-out');
      document.getElementById('app').classList.remove('hidden');
      
      setTimeout(() => {
        document.getElementById('splash-screen').remove();
      }, 500);
    }, 1200);

    // Refresh dashboard
    this.refreshDashboard();

    // Handle back button
    window.addEventListener('popstate', () => {
      const hash = location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash, false);
    });

    // Check initial hash
    const hash = location.hash.replace('#', '');
    if (hash && hash !== 'dashboard') {
      this.navigate(hash, false);
    }
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.navigate(page);
      });
    });
  },

  bindSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const navOrder = ['dashboard', 'scoreboard', 'members', 'payments', 'reports'];
    const container = document.getElementById('page-container');
    if (!container) return;

    container.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    container.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, {passive: true});

    const handleSwipe = () => {
      // Disable swipe navigation during fullscreen mode
      if (document.body.classList.contains('scoreboard-fullscreen')) return;

      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      
      // Threshold 60px for swipe, and ensure it's a mostly horizontal motion
      if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
        const currentIndex = navOrder.indexOf(this.currentPage);
        if (currentIndex === -1) return;

        if (diffX > 0) {
          // Swipe Right (Go back a tab)
          if (currentIndex > 0) {
            this.navigate(navOrder[currentIndex - 1]);
          }
        } else {
          // Swipe Left (Go forward a tab)
          if (currentIndex < navOrder.length - 1) {
            this.navigate(navOrder[currentIndex + 1]);
          }
        }
      }
    };
  },

  navigate(page, pushState = true) {
    if (this.currentPage === page) return;

    // Detect direction
    const navOrder = ['dashboard', 'scoreboard', 'members', 'payments', 'reports'];
    const oldIndex = navOrder.indexOf(this.currentPage);
    const newIndex = navOrder.indexOf(page);
    let slideClass = '';
    
    if (oldIndex !== -1 && newIndex !== -1) {
       slideClass = newIndex > oldIndex ? 'slide-forward' : 'slide-backward';
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'slide-forward', 'slide-backward');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      if (slideClass) targetPage.classList.add(slideClass);
      targetPage.classList.add('active');
    }

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update header
    const titles = {
      dashboard: 'Dashboard',
      scoreboard: 'Skor Pertandingan',
      members: 'Member',
      payments: 'Pembayaran',
      reports: 'Laporan'
    };
    document.getElementById('header-title').textContent = titles[page] || page;

    this.currentPage = page;

    // Push state
    if (pushState) {
      history.pushState(null, '', `#${page}`);
    }

    // Refresh page data
    this.onPageEnter(page);

    // Scroll to top
    document.querySelector('.page-container').scrollTop = 0;
  },

  onPageEnter(page) {
    switch (page) {
      case 'dashboard':
        this.refreshDashboard();
        break;
      case 'scoreboard':
        Scoreboard.initCustomSelects();
        Scoreboard.renderHistory();
        break;
      case 'members':
        MemberManager.render();
        break;
      case 'payments':
        PaymentManager.render();
        break;
      case 'reports':
        ReportManager.render();
        break;
    }
  },

  refreshDashboard() {
    // Stats
    const members = Store.getMembers();
    const matches = Store.getCompletedMatches();
    const payments = Store.getPayments();
    const settings = Store.getSettings();

    document.getElementById('stat-members').textContent = members.length;
    document.getElementById('stat-matches').textContent = matches.length;

    // Revenue
    const players = Store.getAllPlayers();
    const playerBills = PaymentManager.calculateDailyBills(players, matches, settings, payments);
    
    let unpaidBills = 0;

    playerBills.forEach(p => {
      if (!p.isLunas && p.totalBill > 0) unpaidBills++;
    });

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || p.totalAmount || p.totalBill || 0), 0);

    document.getElementById('stat-revenue').textContent = Utils.formatCurrencyShort(totalRevenue);
    document.getElementById('stat-unpaid').textContent = unpaidBills;

    // Club name
    document.getElementById('welcome-club-name').textContent = settings.clubName || 'Digiminton Club';

    // Simulated Traffic
    const dayOffset = Math.floor(Date.now() / 86400000) % 1000;
    const hour = new Date().getHours() || 1;
    const simVisitors = 1420 + (dayOffset * 15) + hour;
    document.getElementById('sim-visitors').textContent = simVisitors.toLocaleString('id-ID');
    
    // Logic for online users: busy hours (17:00 - 22:00) get higher peaks
    let activeRange = 10;
    if (hour >= 17 && hour <= 22) activeRange = 25;
    const simOnline = Math.floor(Math.random() * activeRange) + 4;
    document.getElementById('sim-online').textContent = simOnline;

    // Recent matches
    this.renderRecentMatches(matches);

    // Top players
    this.renderTopPlayers(matches);
  },

  renderRecentMatches(matches) {
    const container = document.getElementById('recent-matches');
    const recent = matches.slice(-5).reverse();

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🏸</span>
          <p>Belum ada pertandingan</p>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('scoreboard')">Mulai Pertandingan</button>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(m => {
      const t1names = Utils.getTeamNames(m.players.team1);
      const t2names = Utils.getTeamNames(m.players.team2);
      const scoreStr = m.scores.map(s => `${s.team1}-${s.team2}`).join(', ');
      const winnerStr = m.winner === 'draw' ? 'Seri' : 
        `🏆 ${Utils.getTeamNames(m.players[m.winner])}`;

      return `
        <div class="recent-item" onclick="App.navigate('scoreboard')">
          <div class="match-teams">
            <div class="match-team-row">${t1names} vs ${t2names}</div>
            <div class="match-date">
              ${Utils.formatDateTime(m.date)}
              <span style="display:inline-block; margin-left:8px; padding: 2px 6px; background:var(--bg-secondary); border-radius:12px; font-size:11px;">🏸 ${m.shuttlecocksUsed || 0} Bola</span>
            </div>
          </div>
          <div style="text-align:right">
            <div class="match-score">${scoreStr}</div>
            <div class="match-winner-badge">${winnerStr}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTopPlayers(matches) {
    const container = document.getElementById('top-players');
    
    const playerStats = {};
    matches.forEach(match => {
      const processTeam = (team, isWinner) => {
        team.forEach(p => {
          if (!playerStats[p.id]) {
            playerStats[p.id] = { name: p.name, wins: 0, total: 0, scUsed: 0 };
          }
          playerStats[p.id].total++;
          playerStats[p.id].scUsed += (match.shuttlecocksUsed || 0);
          if (isWinner) playerStats[p.id].wins++;
        });
      };

      if (match.winner && match.winner !== 'draw') {
        processTeam(match.players.team1, match.winner === 'team1');
        processTeam(match.players.team2, match.winner === 'team2');
      }
    });

    const ranked = Object.values(playerStats)
      .filter(p => p.total >= 1)
      .map(p => ({ ...p, winRate: Math.round((p.wins / p.total) * 100) }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
      .slice(0, 3);

    if (ranked.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <p>Belum ada member</p>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('members')">Tambah Member</button>
        </div>
      `;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = ranked.map((p, i) => `
      <div class="recent-item" onclick="App.navigate('reports')">
        <div style="font-size:24px;margin-right:4px">${medals[i] || ''}</div>
        <div class="match-teams">
          <div class="match-team-row">${p.name}</div>
          <div class="match-date">${p.total} pertandingan
            <span style="display:inline-block; margin-left:8px; padding: 2px 6px; background:var(--bg-secondary); border-radius:12px; font-size:11px;">🏸 ${p.scUsed || 0} Bola</span>
          </div>
        </div>
        <div style="text-align:right">
          <div class="match-score">${p.winRate}%</div>
          <div class="match-winner-badge">${p.wins}W / ${p.total - p.wins}L</div>
        </div>
      </div>
    `).join('');
  },

  // ===================== THEME =====================
  bindTheme() {
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });
  },

  initTheme() {
    const savedTheme = localStorage.getItem('digiminton_theme') || 'light';
    this.applyTheme(savedTheme);
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const newTheme = isDark ? 'light' : 'dark';
    this.applyTheme(newTheme);
    localStorage.setItem('digiminton_theme', newTheme);
  },

  applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.getElementById('theme-icon-moon').classList.add('hidden');
      document.getElementById('theme-icon-sun').classList.remove('hidden');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.getElementById('theme-icon-moon').classList.remove('hidden');
      document.getElementById('theme-icon-sun').classList.add('hidden');
    }
  },

  // ===================== SETTINGS =====================
  bindSettings() {
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
    
    document.querySelectorAll('[data-close="modal-settings"]').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('modal-settings').classList.add('hidden');
      });
    });

    // Export data
    document.getElementById('btn-export-data').addEventListener('click', () => {
      const data = Store.exportAllData();
      const filename = `digiminton_backup_${new Date().toISOString().split('T')[0]}.json`;
      Utils.downloadFile(filename, data, 'application/json');
      Utils.showToast('Data berhasil di-export! 📤', 'success');
    });

    // Import data
    document.getElementById('btn-import-data').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const confirmed = await Utils.showConfirm(
        'Import Data?',
        'Data saat ini akan ditimpa dengan data dari file. Lanjutkan?',
        '📥'
      );

      if (confirmed) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const success = Store.importData(ev.target.result);
          if (success) {
            Utils.showToast('Data berhasil di-import! 📥', 'success');
            document.getElementById('modal-settings').classList.add('hidden');
            this.refreshDashboard();
            MemberManager.render();
            PaymentManager.render();
            Scoreboard.populatePlayerSelects();
          } else {
            Utils.showToast('Format file tidak valid!', 'error');
          }
        };
        reader.readAsText(file);
      }
      e.target.value = '';
    });

    // Reset data
    document.getElementById('btn-reset-data').addEventListener('click', async () => {
      const confirmed = await Utils.showConfirm(
        'Hapus Semua Data?',
        'SEMUA data (member, pertandingan, pembayaran) akan dihapus permanen!',
        '⚠️'
      );

      if (confirmed) {
        Store.clearAll();
        Utils.showToast('Semua data telah dihapus', 'info');
        document.getElementById('modal-settings').classList.add('hidden');
        this.refreshDashboard();
        MemberManager.render();
        PaymentManager.render();
        Scoreboard.populatePlayerSelects();
      }
    });
  },

  loadSettings() {
    const settings = Store.getSettings();
    document.getElementById('welcome-club-name').textContent = settings.clubName || 'Digiminton Club';
  },

  openSettings() {
    const settings = Store.getSettings();
    document.getElementById('setting-club-name').value = settings.clubName || '';
    document.getElementById('setting-price').value = settings.pricePerShuttlecock || 5000;
    document.getElementById('modal-settings').classList.remove('hidden');
  },

  saveSettings() {
    const clubName = document.getElementById('setting-club-name').value.trim() || 'Digiminton Club';
    const price = parseInt(document.getElementById('setting-price').value) || 5000;

    Store.updateSettings({
      clubName,
      pricePerShuttlecock: price
    });

    document.getElementById('modal-settings').classList.add('hidden');
    this.loadSettings();
    this.refreshDashboard();
    Utils.showToast('Pengaturan disimpan! ⚙️', 'success');
  }
};

// ===================== INITIALIZE =====================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
