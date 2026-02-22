import {
  getDB,
  getCurrentRound,
  getTeams,
  getUsers,
  startRound,
  endRound,
  createTeam,
  deleteTeam,
  updateTeam,
  mergeTeams,
  adjustTeamTokens,
  getTeamById,
  resetDB
} from './data.js';
import { logout, showToast } from './auth.js';

// ===== ADMIN DASHBOARD =====
let adminTab = 'overview';

function renderAdminDashboard() {
  const root = document.getElementById('admin-dashboard-root');
  const db = getDB();
  const round = getCurrentRound();
  const teams = getTeams();
  const users = getUsers();

  root.innerHTML = `
    <div class="dashboard">
      <nav class="dash-nav">
        <div class="dash-logo">
          <span>⚡</span>
          <span>Pitch <span class="accent">It Up</span> — Admin</span>
        </div>
        <div class="dash-nav-right">
          <div class="dash-user-pill">
            <div class="dash-avatar" style="background:linear-gradient(135deg,#ef4444,#7c3aed)">A</div>
            Administrator
          </div>
          <button class="btn-logout" onclick="logout()">Logout</button>
        </div>
      </nav>

      <div class="dash-content">
        <div class="dash-header">
          <h1>⚡ Admin Control Panel</h1>
          <p>Manage rounds, teams, investors and the full event flow</p>
        </div>

        <!-- Admin Tabs -->
        <div class="tabs">
          <button class="tab-btn ${adminTab === 'overview' ? 'active' : ''}" onclick="switchAdminTab('overview',this)">📊 Overview</button>
          <button class="tab-btn ${adminTab === 'rounds' ? 'active' : ''}" onclick="switchAdminTab('rounds',this)">🎯 Rounds</button>
          <button class="tab-btn ${adminTab === 'teams' ? 'active' : ''}" onclick="switchAdminTab('teams',this)">🏢 Teams</button>
          <button class="tab-btn ${adminTab === 'investors' ? 'active' : ''}" onclick="switchAdminTab('investors',this)">👥 Investors</button>
          <button class="tab-btn ${adminTab === 'tokens' ? 'active' : ''}" onclick="switchAdminTab('tokens',this)">🪙 Tokens</button>
          <button class="tab-btn ${adminTab === 'danger' ? 'active' : ''}" onclick="switchAdminTab('danger',this)">⚠️ Danger</button>
        </div>

        <!-- Overview Tab -->
        <div id="admin-tab-overview" class="tab-panel ${adminTab === 'overview' ? 'active' : ''}">
          ${renderAdminOverview(db, round, teams, users)}
        </div>

        <!-- Rounds Tab -->
        <div id="admin-tab-rounds" class="tab-panel ${adminTab === 'rounds' ? 'active' : ''}">
          ${renderAdminRounds(round, db)}
        </div>

        <!-- Teams Tab -->
        <div id="admin-tab-teams" class="tab-panel ${adminTab === 'teams' ? 'active' : ''}">
          ${renderAdminTeams(teams)}
        </div>

        <!-- Investors Tab -->
        <div id="admin-tab-investors" class="tab-panel ${adminTab === 'investors' ? 'active' : ''}">
          ${renderAdminInvestors(users)}
        </div>

        <!-- Tokens Tab -->
        <div id="admin-tab-tokens" class="tab-panel ${adminTab === 'tokens' ? 'active' : ''}">
          ${renderAdminTokens(teams)}
        </div>

        <!-- Danger Tab -->
        <div id="admin-tab-danger" class="tab-panel ${adminTab === 'danger' ? 'active' : ''}">
          ${renderAdminDanger()}
        </div>
      </div>
    </div>
  `;
}

function renderAdminOverview(db, round, teams, users) {
  const totalInvestments = db.investments.length;
  const totalTokensInCirculation = teams.reduce((s, t) => s + (t.currentTokens || 0), 0) +
    users.reduce((s, u) => s + (u.tokens || 0), 0);
  const topTeam = teams.filter(t => t.isActive).sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))[0];

  // Revenue chart for all teams
  const activeTeams = teams.filter(t => t.isActive);

  return `
    <div class="metrics-grid">
      <div class="metric-card purple">
        <div class="metric-icon">🏢</div>
        <div class="metric-label">Active Teams</div>
        <div class="metric-value purple">${teams.filter(t => t.isActive).length}</div>
      </div>
      <div class="metric-card cyan">
        <div class="metric-icon">👥</div>
        <div class="metric-label">Registered Investors</div>
        <div class="metric-value cyan">${users.length}</div>
      </div>
      <div class="metric-card amber">
        <div class="metric-icon">💸</div>
        <div class="metric-label">Total Investments</div>
        <div class="metric-value amber">${totalInvestments}</div>
      </div>
      <div class="metric-card green">
        <div class="metric-icon">🪙</div>
        <div class="metric-label">Tokens Circulating</div>
        <div class="metric-value green">${totalTokensInCirculation.toLocaleString()}</div>
      </div>
      <div class="metric-card purple">
        <div class="metric-icon">🎯</div>
        <div class="metric-label">Rounds Completed</div>
        <div class="metric-value purple">${db.rounds.length}</div>
      </div>
    </div>

    ${round ? `
      <div class="round-banner ${round.status === 'live' ? '' : 'inactive'}" style="margin-bottom:24px">
        <div class="round-info">
          <h3>${round.status === 'live' ? '🔴 Round ' + round.number + ' is LIVE' : '⏸️ Round ' + round.number + ' ended'}</h3>
          <p>Started at ${new Date(round.startedAt).toLocaleTimeString()}</p>
        </div>
        <div class="round-status">
          <div class="status-dot ${round.status === 'live' ? 'live' : 'inactive'}"></div>
          ${round.status === 'live' ? 'Live' : 'Ended'}
        </div>
      </div>
    ` : ''}

    <!-- Team Revenue Chart -->
    ${activeTeams.length > 0 ? `
      <div class="chart-container">
        <div class="chart-title">Team Revenue Comparison</div>
        <div class="bar-chart">
          ${activeTeams.map(t => {
    const maxRev = Math.max(...activeTeams.map(x => (x.totalRevenue || 0)), 1);
    return `<div class="bar" style="height:${Math.max(4, ((t.totalRevenue || 0) / maxRev) * 100)}%"
              data-value="${t.name}: ${t.totalRevenue || 0} tokens"></div>`;
  }).join('')}
        </div>
        <div class="bar-labels">
          ${activeTeams.map(t => `<div class="bar-label">${t.emoji}</div>`).join('')}
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">🏆 Team Leaderboard</div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>#</th><th>Team</th><th>Current Tokens</th><th>Total Revenue</th><th>Investors</th><th>Price</th></tr>
          </thead>
          <tbody>
            ${activeTeams.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).map((t, i) => `
              <tr>
                <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                <td>${t.emoji} ${t.name}</td>
                <td><span style="color:#a78bfa;font-weight:700">🪙 ${t.currentTokens || 0}</span></td>
                <td><span style="color:#fbbf24;font-weight:700">🪙 ${t.totalRevenue || 0}</span></td>
                <td>${t.investorCount || 0}</td>
                <td>${t.basePrice || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty-state"><div class="empty-state-icon">🏗️</div><h3>No teams yet</h3><p>Create teams in the Teams tab</p></div>`}
  `;
}

function renderAdminRounds(round, db) {
  return `
    <div class="form-section">
      <div class="form-section-title">🎯 Round Controls</div>
      <div class="round-controls">
        ${!round || round.status === 'ended' ? `
          <button class="btn-success" onclick="adminStartRound()">▶️ Start New Round</button>
        ` : ''}
        ${round && round.status === 'live' ? `
          <button class="btn-danger" onclick="adminEndRound()">⏹️ End Round ${round.number}</button>
        ` : ''}
      </div>
      ${round ? `
        <div style="margin-top:16px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md)">
          <div style="font-weight:700;margin-bottom:8px">Current Round: #${round.number}</div>
          <div style="color:var(--text-secondary);font-size:0.9rem">
            Status: <span class="badge ${round.status === 'live' ? 'badge-green' : 'badge-gray'}">${round.status}</span>
          </div>
          <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:4px">
            Started: ${new Date(round.startedAt).toLocaleString()}
          </div>
          ${round.endedAt ? `<div style="color:var(--text-secondary);font-size:0.9rem;margin-top:4px">
            Ended: ${new Date(round.endedAt).toLocaleString()}
          </div>` : ''}
        </div>
      ` : '<p style="color:var(--text-muted);margin-top:12px">No rounds started yet</p>'}
    </div>

    <!-- Round History -->
    ${db.rounds.length > 0 ? `
      <div class="card">
        <div class="section-title" style="margin-bottom:16px">📜 Round History</div>
        <table class="data-table">
          <thead>
            <tr><th>Round</th><th>Status</th><th>Started</th><th>Ended</th></tr>
          </thead>
          <tbody>
            ${db.rounds.slice().reverse().map(r => `
              <tr>
                <td>Round ${r.number}</td>
                <td><span class="badge badge-gray">${r.status}</span></td>
                <td>${new Date(r.startedAt).toLocaleString()}</td>
                <td>${r.endedAt ? new Date(r.endedAt).toLocaleString() : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function renderAdminTeams(teams) {
  return `
    <div class="form-section">
      <div class="form-section-title">➕ Create New Team</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Team Name</label>
          <input type="text" id="new-team-name" placeholder="e.g. TechNova" />
        </div>
        <div class="form-group">
          <label class="form-label">Emoji</label>
          <input type="text" id="new-team-emoji" placeholder="🚀" style="max-width:80px" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" id="new-team-username" placeholder="e.g. technova" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="text" id="new-team-password" placeholder="e.g. tech123" />
        </div>
      </div>
      <button class="btn-primary" style="max-width:200px" onclick="adminCreateTeam()">Create Team ✓</button>
    </div>

    <!-- Merge Teams -->
    <div class="form-section">
      <div class="form-section-title">🤝 Merge Teams</div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px">
        Merging combines two teams' tokens and investors. The second team will be deactivated.
      </p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Team 1 (Primary)</label>
          <select id="merge-team-1">
            <option value="">Select team...</option>
            ${teams.filter(t => t.isActive).map(t => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Team 2 (Will be merged)</label>
          <select id="merge-team-2">
            <option value="">Select team...</option>
            ${teams.filter(t => t.isActive).map(t => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn-warning" onclick="adminMergeTeams()">🤝 Merge Teams</button>
    </div>

    <!-- Team List -->
    <div class="card">
      <div class="section-header">
        <div class="section-title">All Teams</div>
        <span class="badge badge-purple">${teams.length} total</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Team</th><th>Username</th><th>Status</th><th>Revenue</th><th>Investors</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${teams.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No teams yet</td></tr>' :
      teams.map(t => `
              <tr>
                <td>${t.emoji} ${t.name}</td>
                <td><code style="color:var(--text-muted)">${t.username}</code></td>
                <td>
                  <span class="badge ${t.isActive ? 'badge-green' : 'badge-red'}">
                    ${t.isActive ? 'Active' : 'Inactive'}
                  </span>
                  ${t.mergedWith ? '<span class="merged-badge" style="margin-left:4px">Merged</span>' : ''}
                </td>
                <td style="color:#fbbf24;font-weight:700">🪙 ${t.totalRevenue || 0}</td>
                <td>${t.investorCount || 0}</td>
                <td>
                  <button class="btn-danger btn-sm" onclick="adminDeleteTeam('${t.id}')">Delete</button>
                  ${!t.isActive ? `<button class="btn-success btn-sm" style="margin-left:6px" onclick="adminReactivateTeam('${t.id}')">Reactivate</button>` : ''}
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminInvestors(users) {
  return `
    <div class="card">
      <div class="section-header">
        <div class="section-title">👥 Registered Investors</div>
        <span class="badge badge-cyan">${users.length} total</span>
      </div>
      ${users.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">👤</div>
          <h3>No investors yet</h3>
          <p>Investors will appear here once they register</p>
        </div>
      ` : `
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Hall Ticket</th><th>College</th><th>Section</th><th>Tokens</th><th>Investments</th><th>Rounds</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td><code style="color:var(--text-muted)">${u.hallTicket}</code></td>
                <td>${u.college}</td>
                <td>${u.section}</td>
                <td style="color:#fbbf24;font-weight:700">🪙 ${u.tokens || 0}</td>
                <td>${(u.investments || []).length}</td>
                <td>${(u.roundsParticipated || []).length}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function renderAdminTokens(teams) {
  return `
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div class="section-title">🪙 Adjust Team Tokens</div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px">
        Note: <strong>Total Revenue</strong> tracks all-time earnings. <strong>Current Tokens</strong> is the spendable balance. 
        Adding tokens increases both; removing only decreases current tokens.
      </p>
      ${teams.filter(t => t.isActive).length === 0 ? `
        <p style="color:var(--text-muted)">No active teams</p>
      ` : `
        <table class="data-table">
          <thead>
            <tr><th>Team</th><th>Current Tokens</th><th>Total Revenue</th><th>Adjust</th></tr>
          </thead>
          <tbody>
            ${teams.filter(t => t.isActive).map(t => `
              <tr>
                <td>${t.emoji} ${t.name}</td>
                <td style="color:#a78bfa;font-weight:700">🪙 ${t.currentTokens || 0}</td>
                <td style="color:#fbbf24;font-weight:700">🪙 ${t.totalRevenue || 0}</td>
                <td>
                  <div class="token-adjust">
                    <input type="number" id="adj-${t.id}" placeholder="Amount" min="1" style="width:90px;padding:6px 10px" />
                    <button class="btn-success btn-sm" onclick="adminAdjustTokens('${t.id}','add')">+ Add</button>
                    <button class="btn-danger btn-sm" onclick="adminAdjustTokens('${t.id}','remove')">− Remove</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Revenue Charts per Team -->
    ${teams.filter(t => t.isActive && (t.revenueHistory || []).length > 0).map(t => {
    const history = t.revenueHistory || [];
    const maxRev = Math.max(...history.map(h => h.amount), 1);
    return `
        <div class="chart-container">
          <div class="chart-title">${t.emoji} ${t.name} — Revenue per Round</div>
          <div class="bar-chart">
            ${history.map(h => `
              <div class="bar" style="height:${Math.max(4, (h.amount / maxRev) * 100)}%"
                data-value="Round ${h.round}: ${h.amount} tokens"></div>
            `).join('')}
          </div>
          <div class="bar-labels">
            ${history.map(h => `<div class="bar-label">R${h.round}</div>`).join('')}
          </div>
        </div>
      `;
  }).join('')}
  `;
}

function renderAdminDanger() {
  return `
    <div class="danger-zone">
      <div class="danger-zone-title">⚠️ Danger Zone</div>
      <p>These actions are irreversible. Please be absolutely sure before proceeding.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-danger" onclick="adminReset()">
            🔄 Reset Everything
        </button>
      </div>
      <div style="margin-top:16px;font-size:0.8rem;color:var(--text-muted)">
        Reset will delete all teams, users, investments, and rounds.
      </div>
    </div>
  `;
}

// ===== ADMIN ACTIONS =====
function switchAdminTab(tab, btn) {
  adminTab = tab;
  document.querySelectorAll('#page-admin .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-admin .tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('admin-tab-' + tab).classList.add('active');
}

async function adminStartRound() {
  const round = await startRound();
  showToast(`🔴 Round ${round.number} is now LIVE! Investors get 🪙 100 tokens`, 'success');
  renderAdminDashboard();
}

async function adminEndRound() {
  const round = await endRound();
  showToast(`⏹️ Round ${round.number} ended`, 'info');
  renderAdminDashboard();
}

async function adminCreateTeam() {
  const name = document.getElementById('new-team-name').value.trim();
  const emoji = document.getElementById('new-team-emoji').value.trim() || '🚀';
  const username = document.getElementById('new-team-username').value.trim().toLowerCase();
  const password = document.getElementById('new-team-password').value.trim();

  if (!name || !username || !password) {
    showToast('Please fill in all team fields', 'error');
    return;
  }

  // Check username uniqueness
  const existing = getTeams().find(t => t.username === username);
  if (existing) {
    showToast('Username already taken', 'error');
    return;
  }

  await createTeam(name, username, password, emoji);
  showToast(`Team "${name}" created! 🎉`, 'success');
  renderAdminDashboard();
}

async function adminDeleteTeam(teamId) {
  const team = getTeamById(teamId);
  if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
  await deleteTeam(teamId);
  showToast(`Team deleted`, 'info');
  renderAdminDashboard();
}

async function adminReactivateTeam(teamId) {
  await updateTeam(teamId, { isActive: true, mergedWith: null });
  showToast('Team reactivated', 'success');
  renderAdminDashboard();
}

async function adminMergeTeams() {
  const id1 = document.getElementById('merge-team-1').value;
  const id2 = document.getElementById('merge-team-2').value;
  if (!id1 || !id2) { showToast('Select both teams', 'error'); return; }
  if (id1 === id2) { showToast('Cannot merge a team with itself', 'error'); return; }
  const t1 = getTeamById(id1);
  const t2 = getTeamById(id2);
  if (!confirm(`Merge "${t1.name}" and "${t2.name}"? "${t2.name}" will be deactivated.`)) return;
  const merged = await mergeTeams(id1, id2);
  showToast(`🤝 Teams merged into "${merged.name}"!`, 'success');
  renderAdminDashboard();
}

async function adminAdjustTokens(teamId, type) {
  const amount = parseInt(document.getElementById('adj-' + teamId).value);
  if (isNaN(amount) || amount <= 0) {
    showToast('Enter a valid amount', 'error');
    return;
  }
  const team = getTeamById(teamId);
  await adjustTeamTokens(teamId, amount, type);
  showToast(`${type === 'add' ? 'Added' : 'Removed'} 🪙 ${amount} ${type === 'add' ? 'to' : 'from'} ${team.name}`, 'success');
  renderAdminDashboard();
}

async function adminReset() {
  if (!confirm('⚠️ RESET EVERYTHING? This will delete ALL data including teams, users, investments and rounds. This CANNOT be undone!')) return;
  if (!confirm('Are you absolutely sure? Type "yes" in the next prompt.')) return;
  const confirmation = prompt('Type "reset" to confirm:');
  if (confirmation !== 'reset') {
    showToast('Reset cancelled', 'info');
    return;
  }
  await resetDB();
  showToast('🔄 Everything has been reset', 'warning');
  renderAdminDashboard();
}

// Attach to window
window.renderAdminDashboard = renderAdminDashboard;
window.switchAdminTab = switchAdminTab;
window.adminStartRound = adminStartRound;
window.adminEndRound = adminEndRound;
window.adminCreateTeam = adminCreateTeam;
window.adminDeleteTeam = adminDeleteTeam;
window.adminReactivateTeam = adminReactivateTeam;
window.adminMergeTeams = adminMergeTeams;
window.adminAdjustTokens = adminAdjustTokens;
window.adminReset = adminReset;

export { renderAdminDashboard };

