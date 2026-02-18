// ===== AUTH MODULE =====

const ADMIN_PASSWORD = 'avaneesh2006';
let currentUser = null;
let currentTeam = null;
let isAdmin = false;

function showModal(type) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    overlay.classList.add('open');

    switch (type) {
        case 'team-login':
            content.innerHTML = renderTeamLoginForm();
            break;
        case 'audience-login':
            content.innerHTML = renderAudienceLoginForm();
            break;
        case 'audience-signup':
            content.innerHTML = renderAudienceSignupForm();
            break;
        case 'admin-login':
            content.innerHTML = renderAdminLoginForm();
            break;
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

// ===== TEAM LOGIN =====
function renderTeamLoginForm() {
    return `
    <div class="modal-title">🏢 Team Login</div>
    <p class="modal-subtitle">Enter your team credentials provided by the coordinator</p>
    <div class="form-group">
      <label class="form-label">Team Username</label>
      <input type="text" id="team-username" placeholder="e.g. technova" autocomplete="username" />
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" id="team-password" placeholder="••••••••" autocomplete="current-password" />
    </div>
    <button class="btn-primary" onclick="loginAsTeam()">Enter Dashboard →</button>
  `;
}

function loginAsTeam() {
    const username = document.getElementById('team-username').value.trim();
    const password = document.getElementById('team-password').value;
    const teams = getTeams();
    const team = teams.find(t => t.username === username && t.password === password);
    if (!team) {
        showToast('Invalid team credentials', 'error');
        return;
    }
    if (!team.isActive) {
        showToast('This team account is inactive', 'error');
        return;
    }
    currentTeam = team;
    closeModal();
    showPage('team');
    renderTeamDashboard(team);
    showToast(`Welcome back, ${team.name}! 🚀`, 'success');
}

// ===== AUDIENCE LOGIN =====
function renderAudienceLoginForm() {
    return `
    <div class="modal-title">💼 Investor Login</div>
    <p class="modal-subtitle">Sign in with your hall ticket number</p>
    <div class="form-group">
      <label class="form-label">Hall Ticket Number</label>
      <input type="text" id="aud-hallticket" placeholder="e.g. 22BD1A0501" autocomplete="username" />
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" id="aud-password" placeholder="••••••••" autocomplete="current-password" />
    </div>
    <button class="btn-primary" onclick="loginAsAudience()">Enter Arena →</button>
    <div class="modal-link">
      Don't have an account? <a onclick="showModal('audience-signup')">Register here</a>
    </div>
  `;
}

function loginAsAudience() {
    const hallTicket = document.getElementById('aud-hallticket').value.trim().toUpperCase();
    const password = document.getElementById('aud-password').value;
    const user = getUserByHallTicket(hallTicket);
    if (!user || user.password !== password) {
        showToast('Invalid credentials', 'error');
        return;
    }
    currentUser = getUserById(user.id); // fresh from DB
    closeModal();
    showPage('audience');
    renderAudienceDashboard(currentUser);
    showToast(`Welcome, ${user.name}! 💼`, 'success');
}

// ===== AUDIENCE SIGNUP =====
function renderAudienceSignupForm() {
    return `
    <div class="modal-title">✨ Join the Arena</div>
    <p class="modal-subtitle">Register as an investor for Pitch It Up</p>
    <div class="form-group">
      <label class="form-label">Hall Ticket Number</label>
      <input type="text" id="reg-hallticket" placeholder="e.g. 22BD1A0501" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" id="reg-name" placeholder="Your name" />
      </div>
      <div class="form-group">
        <label class="form-label">Section</label>
        <input type="text" id="reg-section" placeholder="e.g. A" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">College</label>
      <input type="text" id="reg-college" placeholder="Your college name" />
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" id="reg-password" placeholder="Create a password" />
    </div>
    <div class="form-group">
      <label class="form-label">Confirm Password</label>
      <input type="password" id="reg-confirm" placeholder="Repeat password" />
    </div>
    <button class="btn-primary" onclick="registerAudience()">Create Account →</button>
    <div class="modal-link">
      Already registered? <a onclick="showModal('audience-login')">Sign in</a>
    </div>
  `;
}

function registerAudience() {
    const hallTicket = document.getElementById('reg-hallticket').value.trim().toUpperCase();
    const name = document.getElementById('reg-name').value.trim();
    const section = document.getElementById('reg-section').value.trim().toUpperCase();
    const college = document.getElementById('reg-college').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!hallTicket || !name || !section || !college || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    if (password.length < 4) {
        showToast('Password must be at least 4 characters', 'error');
        return;
    }

    const result = createUser(hallTicket, password, name, college, section);
    if (result.error) {
        showToast(result.error, 'error');
        return;
    }

    currentUser = result;
    closeModal();
    showPage('audience');
    renderAudienceDashboard(currentUser);
    showToast(`Welcome to the arena, ${name}! 🎉`, 'success');
}

// ===== ADMIN LOGIN =====
function renderAdminLoginForm() {
    return `
    <div class="modal-title">⚡ Admin Access</div>
    <p class="modal-subtitle">Enter the admin password to continue</p>
    <div class="form-group">
      <label class="form-label">Admin Password</label>
      <input type="password" id="admin-password" placeholder="••••••••" 
        onkeydown="if(event.key==='Enter') loginAsAdmin()" />
    </div>
    <button class="btn-primary" onclick="loginAsAdmin()">Access Control Panel →</button>
  `;
}

function loginAsAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password !== ADMIN_PASSWORD) {
        showToast('Incorrect admin password', 'error');
        return;
    }
    isAdmin = true;
    closeModal();
    showPage('admin');
    renderAdminDashboard();
    showToast('Admin access granted ⚡', 'success');
}

// ===== LOGOUT =====
function logout() {
    currentUser = null;
    currentTeam = null;
    isAdmin = false;
    showPage('landing');
    updateLandingStats();
    showToast('Logged out successfully', 'info');
}

// ===== PAGE NAVIGATION =====
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== LANDING STATS =====
function updateLandingStats() {
    const stats = getGlobalStats();
    document.getElementById('stat-teams').textContent = stats.teamCount;
    document.getElementById('stat-investors').textContent = stats.investorCount;
    document.getElementById('stat-tokens').textContent = stats.totalTokens.toLocaleString();
    const round = stats.currentRound;
    document.getElementById('stat-round').textContent =
        round ? (round.status === 'live' ? `Round ${round.number} 🔴` : `Round ${round.number} (ended)`) : '—';
}
