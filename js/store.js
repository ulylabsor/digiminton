/* ================================================
   STORE - Data Layer (localStorage CRUD)
   ================================================ */

const Store = {
  KEYS: {
    members: 'digi_members',
    matches: 'digi_matches',
    payments: 'digi_payments',
    settings: 'digi_settings',
    activeMatches: 'digi_active_matches'
  },

  // ===================== HELPERS =====================
  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Store._get error:', e);
      return null;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Store._set error:', e);
    }
  },

  // ===================== MEMBERS =====================
  getMembers() {
    return this._get(this.KEYS.members) || [];
  },

  getMember(id) {
    return this.getMembers().find(m => m.id === id);
  },

  addMember(member) {
    const members = this.getMembers();
    member.id = Utils.generateId('m');
    member.joinDate = new Date().toISOString().split('T')[0];
    members.push(member);
    this._set(this.KEYS.members, members);
    return member;
  },

  updateMember(id, updates) {
    const members = this.getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx !== -1) {
      members[idx] = { ...members[idx], ...updates };
      this._set(this.KEYS.members, members);
      return members[idx];
    }
    return null;
  },

  deleteMember(id) {
    const members = this.getMembers().filter(m => m.id !== id);
    this._set(this.KEYS.members, members);
  },

  getActiveMembers() {
    return this.getMembers().filter(m => m.isActive !== false);
  },

  // Get all players (members + guests)
  getAllPlayers() {
    const members = this.getMembers();
    return members;
  },

  // ===================== MATCHES =====================
  getMatches() {
    return this._get(this.KEYS.matches) || [];
  },

  getMatch(id) {
    return this.getMatches().find(m => m.id === id);
  },

  addMatch(match) {
    const matches = this.getMatches();
    match.id = Utils.generateId('match');
    matches.push(match);
    this._set(this.KEYS.matches, matches);
    return match;
  },

  updateMatch(id, updates) {
    const matches = this.getMatches();
    const idx = matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      matches[idx] = { ...matches[idx], ...updates };
      this._set(this.KEYS.matches, matches);
      return matches[idx];
    }
    return null;
  },

  deleteMatch(id) {
    const matches = this.getMatches().filter(m => m.id !== id);
    this._set(this.KEYS.matches, matches);
  },

  getCompletedMatches() {
    return this.getMatches().filter(m => m.status === 'completed');
  },

  // ===================== PAYMENTS =====================
  getPayments() {
    return this._get(this.KEYS.payments) || [];
  },

  getPayment(id) {
    return this.getPayments().find(p => p.id === id);
  },

  addPayment(payment) {
    const payments = this.getPayments();
    payment.id = Utils.generateId('pay');
    payments.push(payment);
    this._set(this.KEYS.payments, payments);
    return payment;
  },

  updatePayment(id, updates) {
    const payments = this.getPayments();
    const idx = payments.findIndex(p => p.id === id);
    if (idx !== -1) {
      payments[idx] = { ...payments[idx], ...updates };
      this._set(this.KEYS.payments, payments);
      return payments[idx];
    }
    return null;
  },

  deletePayment(id) {
    const payments = this.getPayments().filter(p => p.id !== id);
    this._set(this.KEYS.payments, payments);
  },

  // ===================== ACTIVE MATCHES =====================
  getActiveMatches() {
    return this._get(this.KEYS.activeMatches) || [];
  },

  saveActiveMatch(matchState) {
    const active = this.getActiveMatches();
    const idx = active.findIndex(m => m.id === matchState.id);
    if (idx !== -1) {
      active[idx] = matchState;
    } else {
      active.push(matchState);
    }
    this._set(this.KEYS.activeMatches, active);
  },

  removeActiveMatch(id) {
    const active = this.getActiveMatches().filter(m => m.id !== id);
    this._set(this.KEYS.activeMatches, active);
  },

  getActiveMatch(id) {
    return this.getActiveMatches().find(m => m.id === id);
  },

  // ===================== SETTINGS =====================
  getSettings() {
    return this._get(this.KEYS.settings) || {
      pricePerShuttlecock: 5000,
      currency: 'Rp',
      clubName: 'Digiminton Club'
    };
  },

  updateSettings(updates) {
    const settings = { ...this.getSettings(), ...updates };
    this._set(this.KEYS.settings, settings);
    return settings;
  },

  // ===================== MEMBER STATS =====================
  getMemberStats(memberId) {
    const matches = this.getCompletedMatches();
    let wins = 0;
    let losses = 0;
    let total = 0;

    matches.forEach(match => {
      const inTeam1 = match.players.team1.some(p => p.id === memberId);
      const inTeam2 = match.players.team2.some(p => p.id === memberId);
      
      if (inTeam1 || inTeam2) {
        total++;
        if (match.winner === 'team1' && inTeam1) wins++;
        else if (match.winner === 'team2' && inTeam2) wins++;
        else losses++;
      }
    });

    return {
      total,
      wins,
      losses,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0
    };
  },

  // ===================== EXPORT / IMPORT =====================
  exportAllData() {
    return JSON.stringify({
      members: this.getMembers(),
      matches: this.getMatches(),
      payments: this.getPayments(),
      settings: this.getSettings(),
      exportDate: new Date().toISOString()
    }, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.members) this._set(this.KEYS.members, data.members);
      if (data.matches) this._set(this.KEYS.matches, data.matches);
      if (data.payments) this._set(this.KEYS.payments, data.payments);
      if (data.settings) this._set(this.KEYS.settings, data.settings);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  },

  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
  }
};
