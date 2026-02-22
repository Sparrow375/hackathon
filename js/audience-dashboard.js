import {
    getTeams,
    getTeamById,
    getUserById,
    getCurrentRound,
    getUserInvestmentsThisRound,
    invest
} from './data.js';
import { currentUser, logout, showToast } from './auth.js';

// ===== AUDIENCE DASHBOARD =====
let audienceView = 'home'; // 'home' | 'team-detail'
let selectedTeamId = null;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderAudienceDashboard(user) {
    user = getUserById(user.id) || user;
    const root = document.getElementById('audience-dashboard-root');
    const round = getCurrentRound();
    const isLive = round && round.status === 'live';
    const thisRoundInvestments = getUserInvestmentsThisRound(user.id);
    const slotsUsed = thisRoundInvestments.length;
    const slotsTotal = 3;

    if (audienceView === 'team-detail' && selectedTeamId) {
        renderTeamDetailPage(user, selectedTeamId);
        return;
    }

    const teams = getTeams().filter(t => t.isActive);

    function buildSlots() {
        let html = '';
        for (let i = 0; i < slotsTotal; i++) {
            const inv = thisRoundInvestments[i];
            if (inv) {
                const t = getTeamById(inv.teamId);
                const tname = t ? t.emoji + ' ' + t.name : 'Team';
                html += `<div class="slot filled">${tname}<br/><small style="color:#fbbf24">&#x1FA99; ${inv.amount}</small></div>`;
            } else {
                html += `<div class="slot">Slot ${i + 1}<br/><small>Available</small></div>`;
            }
        }
        return html;
    }

    function buildTeamListHTML() {
        return renderAudienceTeamList(teams, isLive, thisRoundInvestments);
    }

    function buildInvestmentHistory() {
        const investments = user.investments || [];
        if (investments.length === 0) return '';
        let rows = '';
        const invs = investments.slice().reverse();
        for (let i = 0; i < invs.length; i++) {
            const inv = invs[i];
            const team = getTeamById(inv.teamId);
            const tname = team ? team.emoji + ' ' + team.name : 'Unknown Team';
            rows += `
                <div class="investment-item">
                    <div>
                        <div class="investment-team">${tname}</div>
                        <div class="investment-round">Round ${inv.round}</div>
                    </div>
                    <div class="investment-amount">&#x1FA99; ${inv.amount}</div>
                </div>`;
        }
        return `
            <div class="card" style="margin-top:28px">
                <div class="section-header">
                    <div class="section-title">&#x1F4DC; My Investment History</div>
                </div>
                ${rows}
            </div>`;
    }

    let roundBanner = '';
    if (isLive) {
        const slotsFull = slotsUsed >= slotsTotal ? `<p style="color:var(--accent-warning);font-size:0.85rem;margin-top:8px">&#9888; You have used all investment slots for this round</p>` : '';
        roundBanner = `
            <div class="card" style="margin-bottom:24px">
                <div class="section-header">
                    <div class="section-title">&#x1F3AF; Investment Slots &mdash; Round ${round.number}</div>
                    <span class="badge ${slotsUsed >= slotsTotal ? 'badge-red' : 'badge-green'}">${slotsUsed}/${slotsTotal} used</span>
                </div>
                <div class="investment-slots">${buildSlots()}</div>
                ${slotsFull}
            </div>`;
    } else {
        roundBanner = `
            <div class="round-banner inactive" style="margin-bottom:24px">
                <div class="round-info">
                    <h3>&#x23F3; No active round</h3>
                    <p>Wait for the admin to start a round.</p>
                </div>
            </div>`;
    }

    const roundLabel = isLive ? 'Live Teams &mdash; Click to Invest' : 'All Teams';

    root.innerHTML = `
        <div class="dashboard">
            <nav class="dash-nav">
                <div class="dash-logo"><span>&#x1F680;</span><span>Pitch <span class="accent">It Up</span></span></div>
                <div class="dash-nav-right">
                    <div class="dash-user-pill">
                        <div class="dash-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        ${escapeHtml(user.name)}
                    </div>
                    <button class="btn-logout" onclick="logout()">Logout</button>
                </div>
            </nav>
            <div class="dash-content">
                <div class="dash-header">
                    <h1>&#x1F44B; Hey, ${escapeHtml(user.name.split(' ')[0])}!</h1>
                    <p>${escapeHtml(user.college)} &middot; Section ${escapeHtml(user.section)} &middot; ${escapeHtml(user.hallTicket)}</p>
                </div>
                <div class="metrics-grid" style="margin-bottom:24px">
                    <div class="metric-card purple">
                        <div class="metric-icon">&#x1FA99;</div>
                        <div class="metric-label">Your Tokens</div>
                        <div class="metric-value purple">${(user.tokens || 0).toLocaleString()}</div>
                    </div>
                    <div class="metric-card ${isLive ? 'green' : 'amber'}">
                        <div class="metric-icon">${isLive ? '&#x1F534;' : '&#x23F3;'}</div>
                        <div class="metric-label">Round Status</div>
                        <div class="metric-value ${isLive ? 'green' : 'amber'}">${isLive ? 'Round ' + round.number : 'Standby'}</div>
                    </div>
                    <div class="metric-card cyan">
                        <div class="metric-icon">&#x1F4CA;</div>
                        <div class="metric-label">Investments Made</div>
                        <div class="metric-value cyan">${(user.investments || []).length}</div>
                    </div>
                    <div class="metric-card amber">
                        <div class="metric-icon">&#x1F3C6;</div>
                        <div class="metric-label">Rounds Participated</div>
                        <div class="metric-value amber">${(user.roundsParticipated || []).length}</div>
                    </div>
                </div>
                ${roundBanner}
                <div class="section-header">
                    <div class="section-title">&#x1F3E2; ${roundLabel}</div>
                    <span class="badge badge-purple">${teams.length} teams</span>
                </div>
                <div class="search-bar">
                    <span class="search-icon">&#x1F50D;</span>
                    <input type="text" id="team-search" placeholder="Search teams..." oninput="filterAudienceTeams()" />
                </div>
                <div class="team-list" id="audience-team-list">${buildTeamListHTML()}</div>
                ${buildInvestmentHistory()}
            </div>
        </div>`;
}

function renderAudienceTeamList(teams, isLive, thisRoundInvestments) {
    if (teams.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">&#x1F3D7;</div><h3>No teams yet</h3><p>Teams will appear here once the admin creates them</p></div>';
    }
    let html = '';
    for (const team of teams) {
        const alreadyInvested = thisRoundInvestments.find(inv => inv.teamId === team.id);
        const mergedBadge = team.mergedWith ? '<span class="merged-badge">&#x1F91D; Merged</span>' : '';
        const investedBadge = alreadyInvested ? '<span class="badge badge-green" style="margin-left:4px">&#x2713; Invested</span>' : '';
        html += `
            <div class="team-list-item" onclick="viewTeamDetail('${team.id}')">
                <div class="team-avatar">${team.emoji}</div>
                <div class="team-info">
                    <div class="team-name">${escapeHtml(team.name)}${mergedBadge}</div>
                    <div class="team-meta"><span>${escapeHtml(team.tagline || 'No tagline set')}</span>${investedBadge}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <div class="team-price"><span class="token-icon">&#x1FA99;</span>${team.basePrice}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${team.investorCount || 0} investors</div>
                </div>
            </div>`;
    }
    return html;
}

function filterAudienceTeams() {
    const query = document.getElementById('team-search').value.toLowerCase();
    const teams = getTeams().filter(t =>
        t.isActive && (t.name.toLowerCase().includes(query) || (t.tagline || '').toLowerCase().includes(query))
    );
    const round = getCurrentRound();
    const isLive = round && round.status === 'live';
    const thisRoundInvestments = getUserInvestmentsThisRound(currentUser.id);
    document.getElementById('audience-team-list').innerHTML = renderAudienceTeamList(teams, isLive, thisRoundInvestments);
}

function viewTeamDetail(teamId) {
    audienceView = 'team-detail';
    selectedTeamId = teamId;
    renderTeamDetailPage(currentUser, teamId);
}

function renderTeamDetailPage(user, teamId) {
    const team = getTeamById(teamId);
    const root = document.getElementById('audience-dashboard-root');
    const round = getCurrentRound();
    const isLive = round && round.status === 'live';
    const thisRoundInvestments = getUserInvestmentsThisRound(user.id);
    const alreadyInvested = thisRoundInvestments.find(inv => inv.teamId === teamId);
    const slotsUsed = thisRoundInvestments.length;

    if (!team) {
        root.innerHTML = '<div class="dash-content"><p>Team not found</p></div>';
        return;
    }

    let investSection = '';
    if (isLive) {
        let investInner = '';
        if (alreadyInvested) {
            investInner = `<div style="color:var(--accent-success);font-weight:600">&#x2705; Already invested &#x1FA99; ${alreadyInvested.amount} in this team this round</div>`;
        } else if (slotsUsed >= 3) {
            investInner = '<p style="color:var(--accent-warning)">&#9888; All 3 investment slots used this round</p>';
        } else if (user.tokens < team.basePrice) {
            investInner = `<p style="color:var(--accent-danger)">&#x274C; Insufficient tokens. You need at least ${team.basePrice} tokens.</p>`;
        } else {
            investInner = `
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                    <div>
                        <label class="form-label">Amount (min ${team.basePrice}, max ${user.tokens})</label>
                        <input type="number" id="invest-amount" value="${team.basePrice}" min="${team.basePrice}" max="${user.tokens}" style="max-width:160px" />
                    </div>
                    <button class="invest-btn" onclick="doInvest('${team.id}')" style="margin-top:20px">&#x1F4B8; Invest Now</button>
                </div>
                <p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px">Your balance: &#x1FA99; ${user.tokens} &middot; Slots remaining: ${3 - slotsUsed}</p>`;
        }
        investSection = `
            <div class="card" style="margin-bottom:24px">
                <div class="section-title" style="margin-bottom:16px">&#x1F4B8; Invest in ${escapeHtml(team.name)}</div>
                ${investInner}
            </div>`;
    } else {
        investSection = `
            <div class="round-banner inactive" style="margin-bottom:24px">
                <div class="round-info">
                    <h3>&#x23F3; Investments open when a round is live</h3>
                    <p>Check back when the admin starts a round</p>
                </div>
            </div>`;
    }

    let membersSection = '';
    if (team.members && team.members.length > 0) {
        let memberChips = '';
        for (const member of team.members) {
            memberChips += `<div style="background:var(--bg-elevated);border:1px solid var(--border-normal);padding:6px 14px;border-radius:var(--radius-full);font-size:0.85rem;font-weight:600">${escapeHtml(member)}</div>`;
        }
        membersSection = `
            <div class="card" style="margin-bottom:20px">
                <div class="section-title" style="margin-bottom:12px">&#x1F465; Team Members</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap">${memberChips}</div>
            </div>`;
    }

    let linksSection = '';
    if (team.links && team.links.length > 0) {
        let linkChips = '';
        for (const link of team.links) {
            linkChips += `<a href="${link.url}" target="_blank" class="link-chip">&#x1F517; ${escapeHtml(link.label)}</a>`;
        }
        linksSection = `
            <div class="card" style="margin-bottom:20px">
                <div class="section-title" style="margin-bottom:12px">&#x1F517; Links &amp; Resources</div>
                <div class="link-chips">${linkChips}</div>
            </div>`;
    }

    const mergedBadge = team.mergedWith ? `<div class="merged-badge" style="margin-bottom:16px">&#x1F91D; Merged Team</div>` : '';

    root.innerHTML = `
        <div class="dashboard">
            <nav class="dash-nav">
                <div class="dash-logo"><span>&#x1F680;</span><span>Pitch <span class="accent">It Up</span></span></div>
                <div class="dash-nav-right">
                    <div class="dash-user-pill">
                        <div class="dash-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        ${escapeHtml(user.name)}
                    </div>
                    <button class="btn-logout" onclick="logout()">Logout</button>
                </div>
            </nav>
            <div class="dash-content">
                <button class="btn-back" onclick="goBackToList()">&#x2190; Back to Teams</button>
                <div class="team-detail-hero">
                    <div style="font-size:3rem;margin-bottom:12px">${team.emoji}</div>
                    <div class="team-detail-name">${escapeHtml(team.name)}</div>
                    <div class="team-detail-tagline">${escapeHtml(team.tagline || 'No tagline set')}</div>
                    ${mergedBadge}
                    <div class="team-detail-stats">
                        <div class="team-detail-stat"><div class="team-detail-stat-label">Base Price</div><div class="team-detail-stat-value" style="color:#fbbf24">&#x1FA99; ${team.basePrice}</div></div>
                        <div class="team-detail-stat"><div class="team-detail-stat-label">Total Investors</div><div class="team-detail-stat-value" style="color:#22d3ee">${team.investorCount || 0}</div></div>
                        <div class="team-detail-stat"><div class="team-detail-stat-label">Unique Investors</div><div class="team-detail-stat-value" style="color:#a78bfa">${(team.uniqueInvestors || []).length}</div></div>
                        <div class="team-detail-stat"><div class="team-detail-stat-label">Total Revenue</div><div class="team-detail-stat-value" style="color:#34d399">&#x1FA99; ${team.totalRevenue || 0}</div></div>
                    </div>
                </div>
                ${investSection}
                <div class="card" style="margin-bottom:20px">
                    <div class="section-title" style="margin-bottom:12px">&#x1F4CB; About</div>
                    <p style="color:var(--text-secondary);line-height:1.7;font-size:0.95rem">${team.description ? escapeHtml(team.description) : '<em style="color:var(--text-muted)">No description provided yet</em>'}</p>
                </div>
                ${membersSection}
                ${linksSection}
            </div>
        </div>`;
}

async function doInvest(teamId) {
    const amount = parseInt(document.getElementById('invest-amount').value);
    const team = getTeamById(teamId);
    if (isNaN(amount) || amount < team.basePrice) {
        showToast(`Minimum investment is ${team.basePrice} tokens`, 'error');
        return;
    }
    const result = await invest(currentUser.id, teamId, amount);
    if (result.error) {
        showToast(result.error, 'error');
        return;
    }
    showToast(`Invested ${amount} tokens in ${team.name}!`, 'success');
    const freshUser = getUserById(currentUser.id);
    renderTeamDetailPage(freshUser, teamId);
}

function goBackToList() {
    audienceView = 'home';
    selectedTeamId = null;
    renderAudienceDashboard(currentUser);
}

// Attach to window
window.renderAudienceDashboard = renderAudienceDashboard;
window.filterAudienceTeams = filterAudienceTeams;
window.viewTeamDetail = viewTeamDetail;
window.doInvest = doInvest;
window.goBackToList = goBackToList;

export { renderAudienceDashboard };

