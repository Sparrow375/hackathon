import {
  getTeamById,
  getCurrentRound,
  getDB,
  updateTeam
} from './data.js';
import { currentTeam, logout, showToast } from './auth.js';

// ===== TEAM DASHBOARD =====

function renderTeamDashboard(team) {
  team = getTeamById(team.id) || team; // fresh data
  const root = document.getElementById('team-dashboard-root');
  const round = getCurrentRound();
  const db_data = getDB();
  const teamInvestments = (db_data.investments || []).filter(i => i.teamId === team.id);

  root.innerHTML = `
    <div class="dashboard">
      <nav class="dash-nav">
        <div class="dash-logo">
          <span>${team.emoji}</span>
          <span>Pitch <span class="accent">It Up</span></span>
        </div>
        <div class="dash-nav-right">
          <div class="dash-user-pill">
            <div class="dash-avatar">${team.name.charAt(0)}</div>
            ${team.name}
          </div>
          <button class="btn-logout" onclick="logout()">Logout</button>
        </div>
      </nav>

      <div class="dash-content">
        <div class="dash-header">
          <h1>${team.emoji} ${team.name}</h1>
          <p>Team Dashboard · Manage your pitch and track investments</p>
        </div>

        ${round && round.status === 'live' ? `
          <div class="round-banner">
            <div class="round-info">
              <h3>🔴 Round ${round.number} is LIVE!</h3>
              <p>Investors are watching — make sure your profile is up to date</p>
            </div>
            <div class="round-status">
              <div class="status-dot live"></div>
              Live
            </div>
          </div>
        ` : `
          <div class="round-banner inactive">
            <div class="round-info">
              <h3>⏳ Waiting for next round</h3>
              <p>Get your profile ready before the round starts</p>
            </div>
            <div class="round-status">
              <div class="status-dot inactive"></div>
              Standby
            </div>
          </div>
        `}

        <div class="metrics-grid">
          <div class="metric-card purple">
            <div class="metric-icon">🪙</div>
            <div class="metric-label">Current Tokens</div>
            <div class="metric-value purple">${(team.currentTokens || 0).toLocaleString()}</div>
          </div>
          <div class="metric-card amber">
            <div class="metric-icon">📈</div>
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value amber">${(team.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div class="metric-card cyan">
            <div class="metric-icon">👥</div>
            <div class="metric-label">Total Investors</div>
            <div class="metric-value cyan">${team.investorCount || 0}</div>
          </div>
          <div class="metric-card green">
            <div class="metric-icon">✨</div>
            <div class="metric-label">Unique Investors</div>
            <div class="metric-value green">${(team.uniqueInvestors || []).length}</div>
          </div>
          <div class="metric-card purple">
            <div class="metric-icon">💰</div>
            <div class="metric-label">Base Price</div>
            <div class="metric-value purple">${team.basePrice} <span style="font-size:1rem">tokens</span></div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTeamTab('profile', this)">📝 Profile</button>
          <button class="tab-btn" onclick="switchTeamTab('investments', this)">💹 Investments</button>
          <button class="tab-btn" onclick="switchTeamTab('settings', this)">⚙️ Settings</button>
        </div>

        <!-- Profile Tab -->
        <div id="team-tab-profile" class="tab-panel active">
          <div class="form-section">
            <div class="form-section-title">🏢 Public Profile</div>
            <div class="form-group">
              <label class="form-label">Team Name</label>
              <input type="text" id="team-edit-name" value="${escapeHtml(team.name)}" placeholder="Your team name" />
            </div>
            <div class="form-group">
              <label class="form-label">Tagline</label>
              <input type="text" id="team-edit-tagline" value="${escapeHtml(team.tagline || '')}" placeholder="One-liner pitch (e.g. 'Disrupting logistics with AI')" />
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="team-edit-desc" rows="4" placeholder="Tell investors about your startup, problem you solve, and your solution...">${escapeHtml(team.description || '')}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Team Emoji</label>
              <input type="text" id="team-edit-emoji" value="${team.emoji}" placeholder="🚀" style="max-width:80px" />
            </div>
            <div class="form-group">
              <label class="form-label">Team Members (comma separated)</label>
              <input type="text" id="team-edit-members" value="${(team.members || []).join(', ')}" placeholder="Alice, Bob, Charlie" />
            </div>
            <div class="form-group">
              <label class="form-label">Links (one per line — label:url)</label>
              <textarea id="team-edit-links" rows="3" placeholder="Pitch Deck:https://slides.google.com/...&#10;Demo:https://demo.example.com&#10;GitHub:https://github.com/...">${(team.links || []).map(l => l.label + ':' + l.url).join('\n')}</textarea>
            </div>
            <button class="btn-primary" style="max-width:200px" onclick="saveTeamProfile('${team.id}')">Save Profile ✓</button>
          </div>
        </div>

        <!-- Investments Tab -->
        <div id="team-tab-investments" class="tab-panel">
          ${renderTeamInvestmentsTab(team, teamInvestments)}
        </div>

        <!-- Settings Tab -->
        <div id="team-tab-settings" class="tab-panel">
          <div class="form-section">
            <div class="form-section-title">💰 Pricing Settings</div>
            <div class="form-group">
              <label class="form-label">Base Investment Price (tokens)</label>
              <input type="number" id="team-base-price" value="${team.basePrice}" min="30" max="100" />
              <div class="price-hint">Must be between 30 and 100 tokens. This is the minimum investment amount.</div>
            </div>
            <button class="btn-primary" style="max-width:200px" onclick="saveTeamPrice('${team.id}')">Update Price ✓</button>
          </div>
          <div class="form-section">
            <div class="form-section-title">🔐 Change Password</div>
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" id="team-old-pass" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="team-new-pass" placeholder="••••••••" />
            </div>
            <button class="btn-secondary" onclick="changeTeamPassword('${team.id}')">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTeamInvestmentsTab(team, investments) {
  if (investments.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>No investments yet</h3>
      <p>Investments will appear here once a round starts and investors back your team</p>
    </div>`;
  }

  // Revenue chart
  const db = getDB();
  const maxRound = db.roundCount || 1;
  const chartBars = [];
  const revenueHistory = team.revenueHistory || [];
  for (let r = 1; r <= maxRound; r++) {
    const hist = revenueHistory.find(h => h.round === r);
    chartBars.push({ round: r, amount: hist ? hist.amount : 0 });
  }
  const maxAmount = Math.max(...chartBars.map(b => b.amount), 1);

  return `
    <div class="chart-container">
      <div class="chart-title">Revenue per Round</div>
      <div class="bar-chart">
        ${chartBars.map(b => `
          <div class="bar" style="height:${Math.max(4, (b.amount / maxAmount) * 100)}%"
            data-value="${b.amount} tokens"></div>
        `).join('')}
      </div>
      <div class="bar-labels">
        ${chartBars.map(b => `<div class="bar-label">R${b.round}</div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <div class="section-title">Investment History</div>
        <span class="badge badge-purple">${investments.length} total</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Amount</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${investments.sort((a, b) => b.timestamp - a.timestamp).map(inv => `
            <tr>
              <td><span class="badge badge-purple">Round ${inv.round}</span></td>
              <td><span style="color:#fbbf24;font-weight:700">🪙 ${inv.amount}</span></td>
              <td>${new Date(inv.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function switchTeamTab(tab, btn) {
  document.querySelectorAll('#page-team .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-team .tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('team-tab-' + tab).classList.add('active');
}

async function saveTeamProfile(teamId) {
  const name = document.getElementById('team-edit-name').value.trim();
  const tagline = document.getElementById('team-edit-tagline').value.trim();
  const description = document.getElementById('team-edit-desc').value.trim();
  const emoji = document.getElementById('team-edit-emoji').value.trim() || '🚀';
  const membersRaw = document.getElementById('team-edit-members').value;
  const linksRaw = document.getElementById('team-edit-links').value;

  if (!name) { showToast('Team name cannot be empty', 'error'); return; }

  const members = membersRaw.split(',').map(m => m.trim()).filter(Boolean);
  const links = linksRaw.split('\n').map(l => {
    const colonIdx = l.indexOf(':');
    if (colonIdx === -1) return null;
    return { label: l.slice(0, colonIdx).trim(), url: l.slice(colonIdx + 1).trim() };
  }).filter(Boolean);

  await updateTeam(teamId, { name, tagline, description, emoji, members, links });
  showToast('Profile updated! ✓', 'success');
  const updated = getTeamById(teamId);
  renderTeamDashboard(updated);
}

async function saveTeamPrice(teamId) {
  const price = parseInt(document.getElementById('team-base-price').value);
  if (isNaN(price) || price < 30 || price > 100) {
    showToast('Price must be between 30 and 100 tokens', 'error');
    return;
  }
  await updateTeam(teamId, { basePrice: price });
  showToast(`Base price set to ${price} tokens ✓`, 'success');
}

async function changeTeamPassword(teamId) {
  const oldPass = document.getElementById('team-old-pass').value;
  const newPass = document.getElementById('team-new-pass').value;
  const team = getTeamById(teamId);
  if (team.password !== oldPass) {
    showToast('Current password is incorrect', 'error');
    return;
  }
  if (newPass.length < 4) {
    showToast('New password must be at least 4 characters', 'error');
    return;
  }
  await updateTeam(teamId, { password: newPass });
  showToast('Password changed successfully ✓', 'success');
  document.getElementById('team-old-pass').value = '';
  document.getElementById('team-new-pass').value = '';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Attach to window
window.renderTeamDashboard = renderTeamDashboard;
window.switchTeamTab = switchTeamTab;
window.saveTeamProfile = saveTeamProfile;
window.saveTeamPrice = saveTeamPrice;
window.changeTeamPassword = changeTeamPassword;

export { renderTeamDashboard };

