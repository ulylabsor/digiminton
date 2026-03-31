/* ================================================
   REPORTS - Reports & Charts
   ================================================ */

const ReportManager = {
  matchesChart: null,
  revenueChart: null,
  allMatchesPage: 1,
  shuttlecockMatchesPage: 1,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('report-period').addEventListener('change', () => {
      this.allMatchesPage = 1;
      this.shuttlecockMatchesPage = 1;
      this.render();
    });
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
  },

  render() {
    const period = document.getElementById('report-period').value;
    const matches = this.filterByPeriod(Store.getCompletedMatches(), period);
    const payments = this.filterByPeriod(Store.getPayments(), period);

    this.renderCharts(matches, payments);
    this.renderLeaderboard(matches);
    this.renderShuttlecockMatches(matches);
    this.renderShuttlecockPlayers(matches);
    this.renderAllMatches(matches);
  },

  filterByPeriod(items, period) {
    if (period === 'all') return items;
    
    const now = new Date();
    let startDate;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
    }

    return items.filter(item => new Date(item.date) >= startDate);
  },

  renderCharts(matches, payments) {
    // Destroy existing charts
    if (this.matchesChart) this.matchesChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();

    // Group by month
    const matchesByMonth = {};
    const revenueByMonth = {};
    const months = [];

    matches.forEach(m => {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      matchesByMonth[key] = (matchesByMonth[key] || 0) + 1;
      if (!months.find(mo => mo.key === key)) months.push({ key, label });
    });

    payments.forEach(p => {
      const d = new Date(p.date || p.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      const amount = p.amount || p.totalAmount || p.totalBill || 0;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + amount;
      if (!months.find(mo => mo.key === key)) months.push({ key, label });
    });

    months.sort((a, b) => a.key.localeCompare(b.key));

    // Take last 6 months
    const recentMonths = months.slice(-6);
    const labels = recentMonths.map(m => m.label);

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#a0a0b8', font: { family: 'Inter', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#a0a0b8', font: { family: 'Inter', size: 11 } }
        }
      }
    };

    // Matches Chart
    const matchCtx = document.getElementById('chart-matches');
    if (matchCtx) {
      this.matchesChart = new Chart(matchCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: recentMonths.map(m => matchesByMonth[m.key] || 0),
            backgroundColor: 'rgba(108, 92, 231, 0.6)',
            borderColor: '#6c5ce7',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: chartDefaults
      });
    }

    // Revenue Chart
    const revCtx = document.getElementById('chart-revenue');
    if (revCtx) {
      this.revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: recentMonths.map(m => revenueByMonth[m.key] || 0),
            borderColor: '#00cec9',
            backgroundColor: 'rgba(0, 206, 201, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00cec9',
            pointBorderColor: '#00cec9',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          ...chartDefaults,
          scales: {
            ...chartDefaults.scales,
            y: {
              ...chartDefaults.scales.y,
              ticks: {
                ...chartDefaults.scales.y.ticks,
                callback: (val) => `Rp ${(val / 1000).toFixed(0)}k`
              }
            }
          }
        }
      });
    }
  },

  renderLeaderboard(matches) {
    const container = document.getElementById('leaderboard');
    
    // Calculate stats for all players
    const playerStats = {};
    
    matches.forEach(match => {
      const processTeam = (team, isWinner) => {
        team.forEach(p => {
          if (!playerStats[p.id]) {
            playerStats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, total: 0 };
          }
          playerStats[p.id].total++;
          if (isWinner) playerStats[p.id].wins++;
          else playerStats[p.id].losses++;
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
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

    if (ranked.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🏆</span>
          <p>Belum ada data</p>
        </div>
      `;
      return;
    }

    container.innerHTML = ranked.slice(0, 10).map((p, i) => {
      const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-default';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';

      return `
        <div class="leader-item">
          <div class="leader-rank ${rankClass}">${medal || (i + 1)}</div>
          <div class="leader-info">
            <div class="leader-name">${p.name}</div>
            <div class="leader-meta">${p.total} pertandingan</div>
          </div>
          <div class="leader-stats">
            <div class="leader-winrate">${p.winRate}%</div>
            <div class="leader-record">${p.wins}W - ${p.losses}L</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderShuttlecockMatches(matches) {
    const container = document.getElementById('top-shuttlecock-matches');
    
    const withShuttlecocks = matches
      .filter(m => m.shuttlecocksUsed > 0)
      .sort((a, b) => b.shuttlecocksUsed - a.shuttlecocksUsed);

    if (withShuttlecocks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🏸</span>
          <p>Belum ada data</p>
        </div>
      `;
      return;
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(withShuttlecocks.length / itemsPerPage);
    if (this.shuttlecockMatchesPage > totalPages) this.shuttlecockMatchesPage = totalPages;
    if (this.shuttlecockMatchesPage < 1) this.shuttlecockMatchesPage = 1;

    const start = (this.shuttlecockMatchesPage - 1) * itemsPerPage;
    const paginated = withShuttlecocks.slice(start, start + itemsPerPage);

    let html = paginated.map((m, i) => {
      const absoluteIndex = start + i;
      const rankClass = absoluteIndex === 0 ? 'rank-1' : absoluteIndex === 1 ? 'rank-2' : absoluteIndex === 2 ? 'rank-3' : 'rank-default';
      const medal = absoluteIndex === 0 ? '🥇' : absoluteIndex === 1 ? '🥈' : absoluteIndex === 2 ? '🥉' : '';
      const t1 = Utils.getTeamNames(m.players.team1);
      const t2 = Utils.getTeamNames(m.players.team2);

      return `
        <div class="leader-item">
          <div class="leader-rank ${rankClass}">${medal || (absoluteIndex + 1)}</div>
          <div class="leader-info">
            <div class="leader-name">${t1} vs ${t2}</div>
            <div class="leader-meta">${Utils.formatDate(m.date)}</div>
          </div>
          <div class="leader-stats">
            <div class="shuttlecock-badge">🏸 ${m.shuttlecocksUsed}</div>
          </div>
        </div>
      `;
    }).join('');

    if (totalPages > 1) {
      html += `
        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0;">
          <button class="btn btn-outline btn-sm" onclick="ReportManager.changeShuttlecockMatchesPage(-1)" ${this.shuttlecockMatchesPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Sblmnya
          </button>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Hal ${this.shuttlecockMatchesPage} / ${totalPages}</span>
          <button class="btn btn-outline btn-sm" onclick="ReportManager.changeShuttlecockMatchesPage(1)" ${this.shuttlecockMatchesPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            Selanjutnya
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  changeShuttlecockMatchesPage(delta) {
    this.shuttlecockMatchesPage += delta;
    const period = document.getElementById('report-period').value;
    const matches = this.filterByPeriod(Store.getCompletedMatches(), period);
    this.renderShuttlecockMatches(matches);
  },

  renderShuttlecockPlayers(matches) {
    const container = document.getElementById('top-shuttlecock-players');
    
    const playerShuttlecocks = {};
    
    matches.forEach(match => {
      if (!match.shuttlecocksUsed || match.shuttlecocksUsed <= 0) return;
      
      const allPlayers = [...match.players.team1, ...match.players.team2];
      const perPlayer = match.shuttlecocksUsed; // Total shuttlecocks for this match
      
      allPlayers.forEach(p => {
        if (!playerShuttlecocks[p.id]) {
          playerShuttlecocks[p.id] = { id: p.id, name: p.name, totalShuttlecocks: 0, matchCount: 0 };
        }
        playerShuttlecocks[p.id].totalShuttlecocks += perPlayer;
        playerShuttlecocks[p.id].matchCount++;
      });
    });

    const ranked = Object.values(playerShuttlecocks)
      .sort((a, b) => b.totalShuttlecocks - a.totalShuttlecocks)
      .slice(0, 10);

    if (ranked.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">👤</span>
          <p>Belum ada data</p>
        </div>
      `;
      return;
    }

    container.innerHTML = ranked.map((p, i) => {
      const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-default';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';

      return `
        <div class="leader-item">
          <div class="leader-rank ${rankClass}">${medal || (i + 1)}</div>
          <div class="leader-info">
            <div class="leader-name">${p.name}</div>
            <div class="leader-meta">${p.matchCount} pertandingan</div>
          </div>
          <div class="leader-stats">
            <div class="shuttlecock-badge">🏸 ${p.totalShuttlecocks}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderAllMatches(matches) {
    const container = document.getElementById('all-matches-list');
    const sorted = matches.slice().reverse();

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>Belum ada pertandingan</p>
        </div>
      `;
      return;
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    if (this.allMatchesPage > totalPages) this.allMatchesPage = totalPages;
    if (this.allMatchesPage < 1) this.allMatchesPage = 1;

    const start = (this.allMatchesPage - 1) * itemsPerPage;
    const paginated = sorted.slice(start, start + itemsPerPage);

    let html = paginated.map(m => {
      const t1names = Utils.getTeamNames(m.players.team1);
      const t2names = Utils.getTeamNames(m.players.team2);
      const scoreStr = m.scores.map(s => `${s.team1}-${s.team2}`).join(', ');
      const winnerStr = m.winner === 'draw' ? 'Seri' : 
        `🏆 ${Utils.getTeamNames(m.players[m.winner])}`;
      const duration = m.duration ? Utils.formatTime(m.duration) : '';

      return `
        <div class="recent-item">
          <div class="match-teams">
            <div class="match-team-row">${t1names} vs ${t2names}</div>
            <div class="match-date">${Utils.formatDateTime(m.date)} ${duration ? '• ' + duration : ''}</div>
          </div>
          <div style="text-align:right">
            <div class="match-score">${scoreStr}</div>
            <div class="match-winner-badge">${winnerStr}</div>
          </div>
        </div>
      `;
    }).join('');

    if (totalPages > 1) {
      html += `
        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0;">
          <button class="btn btn-outline btn-sm" onclick="ReportManager.changeAllMatchesPage(-1)" ${this.allMatchesPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Sblmnya
          </button>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Hal ${this.allMatchesPage} / ${totalPages}</span>
          <button class="btn btn-outline btn-sm" onclick="ReportManager.changeAllMatchesPage(1)" ${this.allMatchesPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            Selanjutnya
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  changeAllMatchesPage(delta) {
    this.allMatchesPage += delta;
    const period = document.getElementById('report-period').value;
    const matches = this.filterByPeriod(Store.getCompletedMatches(), period);
    this.renderAllMatches(matches);
  },

  exportCSV() {
    const matches = Store.getCompletedMatches();
    const payments = Store.getPayments();

    if (matches.length === 0 && payments.length === 0) {
      Utils.showToast('Tidak ada data untuk di-export', 'warning');
      return;
    }

    // Match CSV
    let csv = 'LAPORAN PERTANDINGAN DIGIMINTON\n';
    csv += `Tanggal Export: ${Utils.formatDateTime(new Date().toISOString())}\n\n`;
    csv += 'Tanggal,Tim 1,Tim 2,Skor,Pemenang,Shuttlecock,Durasi\n';

    matches.forEach(m => {
      const t1 = Utils.getTeamNames(m.players.team1);
      const t2 = Utils.getTeamNames(m.players.team2);
      const scores = m.scores.map(s => `${s.team1}-${s.team2}`).join(' | ');
      const winner = m.winner === 'draw' ? 'Seri' : Utils.getTeamNames(m.players[m.winner]);
      const duration = m.duration ? Utils.formatTime(m.duration) : '-';
      
      csv += `"${Utils.formatDateTime(m.date)}","${t1}","${t2}","${scores}","${winner}",${m.shuttlecocksUsed || 0},"${duration}"\n`;
    });

    csv += '\n\nLAPORAN PEMBAYARAN\n';
    csv += 'Tanggal,Deskripsi,Shuttlecock,Biaya Tambahan,Total,Per Pemain,Status\n';

    payments.forEach(p => {
      const paidCount = p.players.filter(pl => pl.paid).length;
      const status = paidCount === p.players.length ? 'Lunas' : `${paidCount}/${p.players.length} Lunas`;
      
      csv += `"${Utils.formatDateTime(p.date)}","${p.description}",${p.shuttlecocksUsed},${p.extraCost || 0},${p.totalAmount},${p.perPlayer},"${status}"\n`;
    });

    const filename = `digiminton_laporan_${new Date().toISOString().split('T')[0]}.csv`;
    Utils.downloadFile(filename, csv, 'text/csv');
    Utils.showToast('Laporan berhasil di-export! 📊', 'success');
  }
};
