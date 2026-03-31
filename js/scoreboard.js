/* ================================================
   SCOREBOARD - Match Score Tracking + Timer
   Supports multiple concurrent matches
   ================================================ */

const Scoreboard = {
  match: null,
  activeMatchId: null,
  currentSet: 0,
  undoStack: [],
  timer: null,
  timerSeconds: 0,
  timerRunning: false,
  historyPage: 1,

  init() {
    this.bindEvents();
    this.initCustomSelects();
    this.renderActiveMatches();
    this.renderHistory();
  },

  bindEvents() {
    // Format selection
    document.querySelectorAll('input[name="match-format"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.radio-option[data-format]').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.format === e.target.value);
        });
      });
    });

    // Type selection
    document.querySelectorAll('input[name="match-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.radio-option[data-type]').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.type === e.target.value);
        });
        const isDouble = e.target.value === 'double';
        document.querySelectorAll('.double-only').forEach(el => {
          el.classList.toggle('hidden', !isDouble);
        });
      });
    });

    // Start match
    document.getElementById('btn-start-match').addEventListener('click', () => this.startMatch());

    // Score buttons and score displays
    document.querySelectorAll('.score-btn, .score-display').forEach(btn => {
      btn.addEventListener('click', () => {
        const team = parseInt(btn.dataset.team);
        const action = btn.dataset.action;
        if (action === 'plus') this.addScore(team);
        else this.subtractScore(team);
      });
    });

    // Undo
    document.getElementById('btn-undo-score').addEventListener('click', () => this.undo());

    // Pause match (go back to list)
    document.getElementById('btn-pause-match').addEventListener('click', () => this.pauseMatch());

    // End match
    document.getElementById('btn-end-match').addEventListener('click', () => this.endMatch());

    // Save match
    document.getElementById('btn-save-match').addEventListener('click', () => this.saveMatch());

    // New match
    document.getElementById('btn-new-match').addEventListener('click', () => this.resetToSetup());

    // Timer
    document.getElementById('btn-timer-toggle').addEventListener('click', () => this.toggleTimer());
    document.getElementById('btn-timer-reset').addEventListener('click', () => this.resetTimer());

    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
  },

  initCustomSelects() {
    const members = Store.getMembers();
    const actMembers = members.filter(m => m.isActive !== false);

    const playerOptionsData = actMembers.map(m => ({ id: m.id, name: m.name + (m.isGuest ? ' (Tamu)' : '') }));
    playerOptionsData.push({ id: '__guest__', name: '+ Pemain Tamu (Guest)' });

    document.querySelectorAll('.custom-select').forEach(cs => {
      const targetId = cs.dataset.target;
      const hiddenInput = document.getElementById(targetId);
      const searchDisplay = cs.querySelector('.cs-search-display');
      const dropdown = cs.querySelector('.cs-dropdown');
      const optionsContainer = cs.querySelector('.cs-options');

      // Cleanup old listeners to prevent duplicates if called multiple times (e.g. on reset)
      const newSearchDisplay = searchDisplay.cloneNode(true);
      searchDisplay.parentNode.replaceChild(newSearchDisplay, searchDisplay);
      
      const renderOptions = (keyword = '') => {
        const keywordClean = keyword.trim().toLowerCase();
        const filtered = keywordClean === ''
          ? playerOptionsData
          : playerOptionsData.filter(opt => opt.name.toLowerCase().includes(keywordClean));
        
        optionsContainer.innerHTML = filtered.map(opt => `<div class="cs-option" data-value="${opt.id}">${opt.name}</div>`).join('');
        
        optionsContainer.querySelectorAll('.cs-option').forEach(optEl => {
          optEl.addEventListener('click', () => {
            const val = optEl.dataset.value;
            if (val === '__guest__') {
              const name = prompt('Masukkan nama pemain tamu:');
              if (name && name.trim()) {
                const guest = Store.addMember({
                  name: name.trim(),
                  phone: '',
                  isActive: true,
                  isGuest: true
                });
                hiddenInput.value = guest.id;
                newSearchDisplay.value = guest.name + ' (Tamu)';
                this.initCustomSelects(); // Rebuild globally for other dropdowns
              }
            } else {
              hiddenInput.value = val;
              newSearchDisplay.value = optEl.textContent;
            }
            dropdown.classList.add('hidden');
          });
        });
      };

      // When focused or clicked, show dropdown and render all (or filtered)
      newSearchDisplay.addEventListener('focus', () => {
        document.querySelectorAll('.cs-dropdown').forEach(d => d.classList.add('hidden'));
        dropdown.classList.remove('hidden');
        newSearchDisplay.select(); // Highlight text to allow quick replace
        renderOptions(newSearchDisplay.value);
      });
      newSearchDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Filter as user types
      newSearchDisplay.addEventListener('input', (e) => {
        dropdown.classList.remove('hidden'); // Ensure it's open
        hiddenInput.value = ''; // Clear selection since they are typing a new one
        renderOptions(e.target.value);
      });
    });

    // Close on click outside
    if (!this._documentClickBound) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
          document.querySelectorAll('.cs-dropdown').forEach(d => {
            if (!d.classList.contains('hidden')) {
              d.classList.add('hidden');
              // Validate input
              const csNode = d.closest('.custom-select');
              const hInput = document.getElementById(csNode.dataset.target);
              const sDisplay = csNode.querySelector('.cs-search-display');
              if (!hInput.value) sDisplay.value = ''; // Revert if invalid
            }
          });
        }
      });
      this._documentClickBound = true;
    }
  },

  // ===================== MULTI-MATCH =====================

  // Save current match state to localStorage
  persistCurrentMatch(isLeaving = false) {
    if (!this.match || !this.activeMatchId) return;
    const state = {
      id: this.activeMatchId,
      match: this.match,
      currentSet: this.currentSet,
      undoStack: this.undoStack,
      timerSeconds: this.timerSeconds,
      timerWasRunning: this.timerRunning
    };
    if (isLeaving) {
      state.leftAt = Date.now(); // timestamp when user left the scoreboard
    }
    Store.saveActiveMatch(state);
  },

  // Go back to match list (timer keeps running in background)
  pauseMatch() {
    if (!this.match) return;

    // Save state with leftAt timestamp so we can calculate elapsed time on resume
    this.persistCurrentMatch(true);

    // Stop the UI interval (but conceptually the timer keeps running via leftAt)
    this.stopTimer();
    this.exitFullscreen();

    // Clear UI state without clearing match data
    this.match = null;
    this.activeMatchId = null;
    this.currentSet = 0;
    this.undoStack = [];
    this.timerSeconds = 0;

    document.getElementById('match-setup').classList.remove('hidden');
    document.getElementById('active-match').classList.add('hidden');
    document.getElementById('match-result').classList.add('hidden');

    this.renderActiveMatches();
    this.renderHistory();

    Utils.showToast('Kembali ke daftar pertandingan', 'info');
  },

  // Resume a paused match from the active matches list
  resumeMatch(matchId) {
    const saved = Store.getActiveMatch(matchId);
    if (!saved) {
      Utils.showToast('Pertandingan tidak ditemukan!', 'error');
      return;
    }

    // If currently viewing another match, save it first
    if (this.match && this.activeMatchId) {
      this.stopTimer();
      this.persistCurrentMatch(true);
    }

    // Load saved state
    this.activeMatchId = saved.id;
    this.match = saved.match;
    this.currentSet = saved.currentSet;
    this.undoStack = saved.undoStack || [];
    this.timerSeconds = saved.timerSeconds || 0;

    // Calculate elapsed time since user left (timer kept running)
    if (saved.leftAt && saved.timerWasRunning) {
      const elapsedSinceLeft = Math.floor((Date.now() - saved.leftAt) / 1000);
      this.timerSeconds += elapsedSinceLeft;
    }

    // Update UI
    document.getElementById('match-setup').classList.add('hidden');
    document.getElementById('active-match').classList.remove('hidden');
    document.getElementById('match-result').classList.add('hidden');

    // Set team names
    document.getElementById('team1-names').textContent = Utils.getTeamNames(this.match.players.team1);
    document.getElementById('team2-names').textContent = Utils.getTeamNames(this.match.players.team2);

    // Restore display
    this.updateSetIndicators();
    this.updateDisplay();
    this.updateService(1); // Default service indicator

    // Restore timer with corrected time
    document.getElementById('match-timer').textContent = Utils.formatTime(this.timerSeconds);
    if (saved.timerWasRunning !== false) {
      this.startTimer();
    }

    Utils.showToast('Pertandingan dilanjutkan! 🏸', 'success');
  },

  // Delete an active match without saving
  async deleteActiveMatch(matchId) {
    const confirmed = await Utils.showConfirm(
      'Hapus Pertandingan?',
      'Data pertandingan ini akan dihapus dan tidak bisa dikembalikan.',
      '🗑️'
    );
    if (!confirmed) return;

    Store.removeActiveMatch(matchId);
    this.renderActiveMatches();
    Utils.showToast('Pertandingan dihapus', 'info');
  },

  // Render the list of active (paused) matches
  renderActiveMatches() {
    const activeMatches = Store.getActiveMatches();
    const section = document.getElementById('active-matches-section');
    const container = document.getElementById('active-matches-list');

    if (activeMatches.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    container.innerHTML = activeMatches.map(am => {
      const m = am.match;
      const t1 = Utils.getTeamNames(m.players.team1);
      const t2 = Utils.getTeamNames(m.players.team2);
      const s1 = m.currentScore.team1;
      const s2 = m.currentScore.team2;
      // Calculate live timer (add elapsed since user left)
      let liveTimerSeconds = am.timerSeconds || 0;
      if (am.leftAt && am.timerWasRunning) {
        liveTimerSeconds += Math.floor((Date.now() - am.leftAt) / 1000);
      }
      const timer = Utils.formatTime(liveTimerSeconds);
      const setInfo = m.format === '42x2' ? `Set ${am.currentSet + 1}/2` : `Set ${am.currentSet + 1}/${m.maxSets}`;

      return `
        <div class="active-match-card" onclick="Scoreboard.resumeMatch('${am.id}')">
          <div class="am-info">
            <div class="am-teams">${t1} <span class="am-vs">vs</span> ${t2}</div>
            <div class="am-meta">
              <span class="am-score-badge">${s1} - ${s2}</span>
              <span class="am-set">${setInfo}</span>
              <span class="am-timer">⏱️ ${timer}</span>
            </div>
          </div>
          <div class="am-actions">
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); Scoreboard.resumeMatch('${am.id}')">▶ Lanjut</button>
            <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger);" onclick="event.stopPropagation(); Scoreboard.deleteActiveMatch('${am.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ===================== MATCH LIFECYCLE =====================

  startMatch() {
    const format = document.querySelector('input[name="match-format"]:checked').value;
    const type = document.querySelector('input[name="match-type"]:checked').value;
    
    const team1p1 = document.getElementById('team1-p1').value;
    const team1p2 = document.getElementById('team1-p2').value;
    const team2p1 = document.getElementById('team2-p1').value;
    const team2p2 = document.getElementById('team2-p2').value;

    // Validation
    if (!team1p1 || !team2p1) {
      Utils.showToast('Pilih pemain untuk kedua tim!', 'error');
      return;
    }

    if (type === 'double' && (!team1p2 || !team2p2)) {
      Utils.showToast('Pilih 2 pemain untuk pertandingan double!', 'error');
      return;
    }

    // Check duplicates
    const allPlayers = [team1p1, team2p1];
    if (type === 'double') {
      allPlayers.push(team1p2, team2p2);
    }
    const uniquePlayers = new Set(allPlayers);
    if (uniquePlayers.size !== allPlayers.length) {
      Utils.showToast('Pemain tidak boleh sama!', 'error');
      return;
    }

    // Build teams
    const getPlayerObj = (id) => {
      const member = Store.getMember(id);
      return member ? { id: member.id, name: member.name } : { id, name: id };
    };

    const team1 = [getPlayerObj(team1p1)];
    const team2 = [getPlayerObj(team2p1)];
    if (type === 'double') {
      team1.push(getPlayerObj(team1p2));
      team2.push(getPlayerObj(team2p2));
    }

    // Determine format config
    let maxPoints, maxSets;
    if (format === '42x2') {
      maxPoints = 42;
      maxSets = 2;
    } else {
      maxPoints = 21;
      maxSets = 3;
    }

    // Generate a unique ID for this match
    this.activeMatchId = Utils.generateId('am');

    this.match = {
      date: new Date().toISOString(),
      format,
      type,
      maxPoints,
      maxSets,
      players: { team1, team2 },
      scores: [],
      currentScore: { team1: 0, team2: 0 },
      setsWon: { team1: 0, team2: 0 },
      winner: null,
      status: 'in_progress',
      shuttlecocksUsed: 3
    };

    this.currentSet = 0;
    this.undoStack = [];

    // Save to active matches immediately
    this.persistCurrentMatch();

    // Update UI
    document.getElementById('match-setup').classList.add('hidden');
    document.getElementById('active-match').classList.remove('hidden');
    document.getElementById('match-result').classList.add('hidden');

    // Set team names
    document.getElementById('team1-names').textContent = Utils.getTeamNames(team1);
    document.getElementById('team2-names').textContent = Utils.getTeamNames(team2);

    // Set indicators
    this.updateSetIndicators();
    this.updateDisplay();
    
    // Service - team1 starts
    this.updateService(1);

    // Reset and start timer
    this.resetTimer();
    this.startTimer();

    Utils.showToast('Pertandingan dimulai! 🏸', 'success');
  },

  addScore(team) {
    if (!this.match || this.match.status !== 'in_progress') return;

    // Save state for undo
    this.undoStack.push({
      currentScore: { ...this.match.currentScore },
      setsWon: { ...this.match.setsWon },
      scores: [...this.match.scores],
      currentSet: this.currentSet,
      service: team
    });

    this.match.currentScore[`team${team}`]++;

    // Animate score
    const scoreEl = document.getElementById(`score-team${team}`);
    scoreEl.classList.add('score-pulse');
    setTimeout(() => scoreEl.classList.remove('score-pulse'), 300);

    // Switch service
    this.updateService(team);

    // Check set win
    this.checkSetWin();

    this.updateDisplay();

    // Auto-save to localStorage periodically
    this.persistCurrentMatch();
  },

  subtractScore(team) {
    if (!this.match || this.match.status !== 'in_progress') return;
    if (this.match.currentScore[`team${team}`] <= 0) return;

    this.undoStack.push({
      currentScore: { ...this.match.currentScore },
      setsWon: { ...this.match.setsWon },
      scores: [...this.match.scores],
      currentSet: this.currentSet,
      service: team
    });

    this.match.currentScore[`team${team}`]--;
    this.updateDisplay();
    this.persistCurrentMatch();
  },

  undo() {
    if (this.undoStack.length === 0) {
      Utils.showToast('Tidak ada yang bisa di-undo', 'warning');
      return;
    }

    const prev = this.undoStack.pop();
    this.match.currentScore = prev.currentScore;
    this.match.setsWon = prev.setsWon;
    this.match.scores = prev.scores;
    this.currentSet = prev.currentSet;

    this.updateSetIndicators();
    this.updateDisplay();
    this.persistCurrentMatch();
    Utils.showToast('Undo berhasil', 'info');
  },

  checkSetWin() {
    const s1 = this.match.currentScore.team1;
    const s2 = this.match.currentScore.team2;
    const mp = this.match.maxPoints;

    let setWinner = null;

    if (mp === 42) {
      // 42 point match (continuous)
      if (this.currentSet === 0) {
        // First half ends at 21
        if (s1 >= 21 || s2 >= 21) {
          setWinner = s1 >= 21 ? 'team1' : 'team2';
        }
      } else if (this.currentSet === 1) {
        // Second half ends at 42
        if (s1 >= 42 || s2 >= 42) {
          setWinner = s1 >= 42 ? 'team1' : 'team2';
        }
      }
    } else {
      // 21 point set (BWF): need 2 point lead, max 30
      if (s1 >= 21 && s1 - s2 >= 2) setWinner = 'team1';
      else if (s2 >= 21 && s2 - s1 >= 2) setWinner = 'team2';
      else if (s1 >= 30) setWinner = 'team1';
      else if (s2 >= 30) setWinner = 'team2';
    }

    if (setWinner) {
      // Save set score snapshot
      this.match.scores.push({
        team1: this.match.currentScore.team1,
        team2: this.match.currentScore.team2
      });

      this.match.setsWon[setWinner]++;
      this.currentSet++;

      // Check match win
      let matchWon = false;
      if (mp === 42) {
        matchWon = this.currentSet >= 2;
      } else {
        const setsNeeded = Math.ceil(this.match.maxSets / 2);
        matchWon = this.match.setsWon[setWinner] >= setsNeeded;
      }

      if (matchWon) {
        if (mp === 42) {
          // Determine final winner based on total score (which is just the score at 42)
          this.match.winner = s1 > s2 ? 'team1' : (s2 > s1 ? 'team2' : 'draw');
        } else {
          this.match.winner = setWinner;
        }
        this.match.status = 'completed';
        this.stopTimer();
        this.showResult();
        return;
      }

      // Next set
      if (mp !== 42) {
        this.match.currentScore = { team1: 0, team2: 0 };
      }
      this.updateSetIndicators();
      Utils.showToast(`Set ${this.currentSet} selesai! Lanjut set berikutnya`, 'success');
    }
  },

  async endMatch() {
    const confirmed = await Utils.showConfirm(
      'Akhiri Pertandingan?',
      'Pertandingan akan diakhiri dengan skor saat ini.',
      '🏸'
    );
    if (!confirmed) return;

    // Save current set score
    this.match.scores.push({
      team1: this.match.currentScore.team1,
      team2: this.match.currentScore.team2
    });

    // Determine winner by sets won, then by current score
    if (this.match.setsWon.team1 > this.match.setsWon.team2) {
      this.match.winner = 'team1';
    } else if (this.match.setsWon.team2 > this.match.setsWon.team1) {
      this.match.winner = 'team2';
    } else {
      // Tied sets, use current set score
      if (this.match.currentScore.team1 > this.match.currentScore.team2) {
        this.match.winner = 'team1';
      } else if (this.match.currentScore.team2 > this.match.currentScore.team1) {
        this.match.winner = 'team2';
      } else {
        this.match.winner = 'draw';
      }
    }

    this.match.status = 'completed';
    this.stopTimer();
    this.showResult();
  },

  showResult() {
    // Exit fullscreen before showing result
    this.exitFullscreen();

    document.getElementById('active-match').classList.add('hidden');
    document.getElementById('match-result').classList.remove('hidden');

    const winnerName = this.match.winner === 'draw' 
      ? 'Seri!' 
      : `Pemenang: ${Utils.getTeamNames(this.match.players[this.match.winner])}`;
    document.getElementById('result-winner').textContent = winnerName;

    const scoresHtml = this.match.scores.map((s, i) => 
      `<div class="result-set">Set ${i + 1}: ${s.team1} - ${s.team2}</div>`
    ).join('');
    document.getElementById('result-scores').innerHTML = scoresHtml;
  },

  saveMatch() {
    const shuttlecocks = parseInt(document.getElementById('result-shuttlecocks').value) || 0;
    this.match.shuttlecocksUsed = shuttlecocks;
    this.match.duration = this.timerSeconds;

    // Save to completed matches store
    Store.addMatch(this.match);

    // Remove from active matches
    if (this.activeMatchId) {
      Store.removeActiveMatch(this.activeMatchId);
    }

    Utils.showToast('Pertandingan berhasil disimpan! 🎉', 'success');
    this.resetToSetup();
    
    // Refresh interfaces if visible
    if (typeof App !== 'undefined') {
      App.refreshDashboard();
      if (App.currentPage === 'reports') ReportManager.render();
      if (App.currentPage === 'payments') PaymentManager.render();
    }
  },

  resetToSetup() {
    // Remove from active matches if discarding
    if (this.activeMatchId && this.match && this.match.status !== 'completed') {
      // Don't remove — only saveMatch or deleteActiveMatch removes
    }

    this.match = null;
    this.activeMatchId = null;
    this.currentSet = 0;
    this.undoStack = [];
    this.stopTimer();
    this.timerSeconds = 0;
    document.getElementById('match-timer').textContent = '00:00';

    document.getElementById('match-setup').classList.remove('hidden');
    document.getElementById('active-match').classList.add('hidden');
    document.getElementById('match-result').classList.add('hidden');

    // Reset scores display
    document.getElementById('score-team1').textContent = '0';
    document.getElementById('score-team2').textContent = '0';
    document.getElementById('set-scores-display').innerHTML = '';

    document.querySelectorAll('.team1-select, .team2-select').forEach(input => input.value = '');
    document.querySelectorAll('.cs-search-display').forEach(input => input.value = '');
    this.initCustomSelects();
    this.renderActiveMatches();
    this.renderHistory();
  },

  // Fullscreen
  isFullscreen: false,

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    document.body.classList.toggle('scoreboard-fullscreen', this.isFullscreen);
    document.getElementById('fs-expand-icon').classList.toggle('hidden', this.isFullscreen);
    document.getElementById('fs-shrink-icon').classList.toggle('hidden', !this.isFullscreen);
    document.getElementById('fs-label').textContent = this.isFullscreen ? 'Keluar' : 'Fullscreen';

    // Try native fullscreen API & Orientation lock
    if (this.isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch((e) => console.log('Orientation lock failed:', e));
          }
        }).catch(() => {});
      } else if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  },

  exitFullscreen() {
    if (this.isFullscreen) {
      this.isFullscreen = false;
      document.body.classList.remove('scoreboard-fullscreen');
      document.getElementById('fs-expand-icon').classList.remove('hidden');
      document.getElementById('fs-shrink-icon').classList.add('hidden');
      document.getElementById('fs-label').textContent = 'Fullscreen';
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  },

  updateDisplay() {
    document.getElementById('score-team1').textContent = this.match.currentScore.team1;
    document.getElementById('score-team2').textContent = this.match.currentScore.team2;

    // Show previous set scores
    const setScoresHtml = this.match.scores.map((s, i) => {
      const t1Won = s.team1 > s.team2;
      const t2Won = s.team2 > s.team1;
      return `
        <div class="set-score-line" style="margin-bottom: 6px; font-size: 15px;">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Set ${i + 1}</div>
          <span style="${t1Won ? 'font-weight: 800; color: var(--success);' : 'color: var(--text-secondary);'}">
            ${s.team1} ${t1Won ? '✓' : ''}
          </span>
          <span style="color: var(--text-muted); margin: 0 4px;">-</span>
          <span style="${t2Won ? 'font-weight: 800; color: var(--success);' : 'color: var(--text-secondary);'}">
            ${t2Won ? '✓' : ''} ${s.team2}
          </span>
        </div>
      `;
    }).join('');
    document.getElementById('set-scores-display').innerHTML = setScoresHtml;
  },

  updateService(lastScoringTeam) {
    const s1indicator = document.getElementById('service-team1');
    const s2indicator = document.getElementById('service-team2');

    // Service switches to the team that scored
    if (lastScoringTeam === 1) {
      s1indicator.classList.remove('hidden');
      s2indicator.classList.add('hidden');
    } else {
      s1indicator.classList.add('hidden');
      s2indicator.classList.remove('hidden');
    }
  },

  updateSetIndicators() {
    const container = document.getElementById('set-indicators');
    const dots = container.querySelectorAll('.set-dot');
    const maxSets = this.match.maxSets;

    dots.forEach((dot, i) => {
      if (i >= maxSets) {
        dot.classList.add('hidden');
        return;
      }
      dot.classList.remove('hidden', 'active', 'won', 'lost');
      
      if (i === this.currentSet) {
        dot.classList.add('active');
      } else if (i < this.match.scores.length) {
        const setScore = this.match.scores[i];
        if (setScore.team1 > setScore.team2) {
          dot.classList.add('won');
        } else {
          dot.classList.add('lost');
        }
      }
    });
  },

  // Timer
  startTimer() {
    this.timerRunning = true;
    document.getElementById('timer-play-icon').classList.add('hidden');
    document.getElementById('timer-pause-icon').classList.remove('hidden');
    
    this.timer = setInterval(() => {
      this.timerSeconds++;
      document.getElementById('match-timer').textContent = Utils.formatTime(this.timerSeconds);
    }, 1000);
  },

  stopTimer() {
    this.timerRunning = false;
    document.getElementById('timer-play-icon').classList.remove('hidden');
    document.getElementById('timer-pause-icon').classList.add('hidden');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  toggleTimer() {
    if (this.timerRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  },

  resetTimer() {
    this.stopTimer();
    this.timerSeconds = 0;
    document.getElementById('match-timer').textContent = '00:00';
  },

  renderHistory() {
    const container = document.getElementById('scoreboard-history');
    const allMatches = Store.getCompletedMatches().reverse();

    if (allMatches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>Belum ada riwayat</p>
        </div>
      `;
      return;
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(allMatches.length / itemsPerPage);
    if (this.historyPage > totalPages) this.historyPage = totalPages;
    if (this.historyPage < 1) this.historyPage = 1;

    const start = (this.historyPage - 1) * itemsPerPage;
    const paginated = allMatches.slice(start, start + itemsPerPage);

    let html = paginated.map(m => {
      const t1names = Utils.getTeamNames(m.players.team1);
      const t2names = Utils.getTeamNames(m.players.team2);
      const scoreStr = m.scores.map(s => `${s.team1}-${s.team2}`).join(', ');
      const winnerStr = m.winner === 'draw' ? 'Seri' : 
        `🏆 ${Utils.getTeamNames(m.players[m.winner])}`;

      return `
        <div class="recent-item">
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

    if (totalPages > 1) {
      html += `
        <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0;">
          <button class="btn btn-outline btn-sm" onclick="Scoreboard.changeHistoryPage(-1)" ${this.historyPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Sblmnya
          </button>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Hal ${this.historyPage} / ${totalPages}</span>
          <button class="btn btn-outline btn-sm" onclick="Scoreboard.changeHistoryPage(1)" ${this.historyPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            Selanjutnya
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  changeHistoryPage(delta) {
    this.historyPage += delta;
    this.renderHistory();
  }
};
