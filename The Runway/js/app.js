// ===== ALL IMPORTS AT THE TOP (ES Module requirement) =====
import { registerTeam, loginTeam, checkRegistrationOpen } from './data.js';
import { renderAdminDashboard } from './admin-dashboard.js';
// boarding-pass.js import removed (feature disabled)

// Application State
let currentMembers = [{ id: 1 }]; // Start with Leader
let currentTeamData = null; // Stores logged-in team data for dashboard

document.addEventListener('DOMContentLoaded', () => {
    // Hide global loader after a brief simulated load time
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 800);

    // Check for admin URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showModal('admin-login');
    }

    // Do NOT close modal on overlay click (prevents accidental data loss)
    document.querySelector('.modal-box').addEventListener('click', e => e.stopPropagation());
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

// ===== MODAL MANAGER =====
window.showModal = function(type) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    overlay.classList.add('open');
    content.innerHTML = '';

    if (type === 'registration') {
        // Check if registrations are open before showing form
        content.innerHTML = `<div class="modal-header"><h2>Boarding Registration</h2><p>Checking gate status...</p></div><div style="text-align:center;padding:2rem;"><div class="loader-bar-container" style="width:100%;margin:0 auto;"><div class="loader-bar"></div></div></div>`;
        checkRegistrationOpen().then(isOpen => {
            if (!isOpen) {
                content.innerHTML = `
                    <div class="modal-header">
                        <h2>Gate Closed</h2>
                        <p>Flight RNWY-2026</p>
                    </div>
                    <div style="text-align:center; padding: 2rem 0;">
                        <div style="font-size: 3rem; margin-bottom: 1.5rem;">✈️</div>
                        <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.7;">Registrations for The Runway 2026 are currently <strong style="color:var(--text-main);">closed</strong>.<br>Please contact the event coordinators for assistance.</p>
                    </div>
                `;
                return;
            }
            currentMembers = [{ id: 1, isLeader: true }, { id: 2 }];
            content.innerHTML = renderRegistrationForm();
            updateMemberUI();
        });
    } else if (type === 'admin-login') {
        content.innerHTML = renderAdminLoginForm();
    } else if (type === 'team-login') {
        content.innerHTML = renderTeamLoginForm();
    }
};

// Expose for use in the team dashboard HTML
window.getCurrentTeamData = function() { return currentTeamData; };

window.closeModal = function() {
    document.getElementById('modal-overlay').classList.remove('open');
};

// ===== PAGE ROUTING =====
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== TOAST NOTIFICATIONS =====
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'error') icon = '❌';
    if (type === 'success') icon = '✅';

    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// ===== REGISTRATION FLOW =====
function renderRegistrationForm() {
    return `
        <div class="modal-header">
            <h2>Boarding Registration</h2>
            <p>Flight RNWY-2026</p>
        </div>
        <div class="registration-form" id="reg-form">
            <div class="form-section">
                <h3>Team Credentials</h3>
                <div class="input-group">
                    <label>Team Name *</label>
                    <input type="text" id="reg-team-name" placeholder="e.g. Innovators" required>
                </div>
            </div>

            <div id="members-container"></div>

            <button class="btn-outline add-member-btn" onclick="addOptionalMember()" id="add-member-btn">
                + Add Member
            </button>

            <div class="form-section login-creds-section" style="margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--border-light);">
                <h3>Login Credentials</h3>
                <div class="input-group">
                    <label>Team Username *</label>
                    <input type="text" id="reg-team-username" placeholder="e.g. team_innovate" required>
                </div>
                <div class="input-group">
                    <label>Password *</label>
                    <input type="password" id="reg-team-password" placeholder="Create a password" required>
                </div>
            </div>

            <button class="btn-primary w-full mt-2" onclick="submitRegistration()" id="submit-reg-btn">Complete Registration</button>
        </div>
    `;
}

window.addOptionalMember = function() {
    if (currentMembers.length >= 4) {
        showToast("Maximum team size is 4 members.", "error");
        return;
    }
    
    const formData = collectRegistrationData();
    currentMembers.push({ id: currentMembers.length + 1 });
    updateMemberUI();
    
    // Restore data
    restoreRegistrationData(formData);
    if (currentMembers.length >= 4) {
        document.getElementById('add-member-btn').style.display = 'none';
    }
};

window.removeMember = function(index) {
    if (currentMembers.length <= 2) return;
    
    const formData = collectRegistrationData();
    currentMembers.splice(index, 1);
    currentMembers.forEach((m, idx) => m.id = idx + 1);
    updateMemberUI();
    
    // Restore data
    restoreRegistrationData(formData);
    document.getElementById('add-member-btn').style.display = 'inline-block';
};

function collectRegistrationData() {
    const data = {
        teamName: document.getElementById('reg-team-name')?.value || '',
        username: document.getElementById('reg-team-username')?.value || '',
        password: document.getElementById('reg-team-password')?.value || '',
        members: []
    };

    currentMembers.forEach(m => {
        const id = m.id;
        data.members.push({
            id: id,
            name: document.getElementById(`m${id}-name`)?.value || '',
            college: document.getElementById(`m${id}-college`)?.value || 'KMEC',
            roll: document.getElementById(`m${id}-roll`)?.value || '',
            year: document.getElementById(`m${id}-year`)?.value || '1',
            phone: document.getElementById(`m${id}-phone`)?.value || '',
            email: document.getElementById(`m${id}-email`)?.value || ''
        });
    });
    return data;
}

function restoreRegistrationData(data) {
    if (document.getElementById('reg-team-name')) document.getElementById('reg-team-name').value = data.teamName;
    if (document.getElementById('reg-team-username')) document.getElementById('reg-team-username').value = data.username;
    if (document.getElementById('reg-team-password')) document.getElementById('reg-team-password').value = data.password;

    data.members.forEach(m => {
        const id = m.id;
        // Only restore if the field exists (might have been removed)
        if (document.getElementById(`m${id}-name`)) {
            document.getElementById(`m${id}-name`).value = m.name;
            document.getElementById(`m${id}-college`).value = m.college;
            document.getElementById(`m${id}-roll`).value = m.roll;
            document.getElementById(`m${id}-year`).value = m.year;
            document.getElementById(`m${id}-phone`).value = m.phone;
            document.getElementById(`m${id}-email`).value = m.email;
        }
    });
}

function updateMemberUI() {
    const container = document.getElementById('members-container');
    if (!container) return;
    container.innerHTML = currentMembers.map((m, index) => renderMemberFields(m.id, index === 0)).join('');
}

function renderMemberFields(id, isLeader) {
    const title = isLeader ? 'Pilot (Team Leader)' : `Passenger ${id} (Member)`;
    const delBtn = (!isLeader && id > 2) ? `<button class="btn-text text-danger" onclick="removeMember(${id-1})">Remove</button>` : '';

    return `
        <div class="form-section member-section" data-id="${id}">
            <div class="section-header">
                <h3>${title}</h3>
                ${delBtn}
            </div>
            
            <div class="input-row">
                <div class="input-group">
                    <label>Full Name *</label>
                    <input type="text" id="m${id}-name" placeholder="Name" required>
                </div>
                <div class="input-group">
                    <label>College *</label>
                    <select id="m${id}-college" required>
                        <option value="KMEC">KMEC</option>
                    </select>
                </div>
            </div>

            <div class="input-row">
                <div class="input-group">
                    <label>12-Digit Roll Number *</label>
                    <input type="text" id="m${id}-roll" placeholder="e.g. 24BD1A0501" maxlength="12" required>
                </div>
                <div class="input-group">
                    <label>Year of Study *</label>
                    <select id="m${id}-year" required>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                    </select>
                </div>
            </div>

            <div class="input-row">
                <div class="input-group">
                    <label>Phone Number *</label>
                    <input type="tel" id="m${id}-phone" placeholder="10-digit number" maxlength="10" required>
                </div>
                <div class="input-group">
                    <label>Email Address *</label>
                    <input type="email" id="m${id}-email" placeholder="Email" required>
                </div>
            </div>
        </div>
    `;
}

window.submitRegistration = async function() {
    const btn = document.getElementById('submit-reg-btn');
    
    const teamData = {
        teamName: document.getElementById('reg-team-name').value.trim(),
        username: document.getElementById('reg-team-username').value.trim(),
        password: document.getElementById('reg-team-password').value,
        members: []
    };

    if (!teamData.teamName || !teamData.username || !teamData.password) {
        return showToast("Please fill in all Team Credentials.", "error");
    }

    for (let i = 0; i < currentMembers.length; i++) {
        const id = currentMembers[i].id;
        const m = {
            name: document.getElementById(`m${id}-name`).value.trim(),
            college: document.getElementById(`m${id}-college`).value,
            rollNo: document.getElementById(`m${id}-roll`).value.trim().toUpperCase(),
            year: document.getElementById(`m${id}-year`).value,
            phone: document.getElementById(`m${id}-phone`).value.trim(),
            email: document.getElementById(`m${id}-email`).value.trim()
        };

        if (!m.name || !m.college || !m.rollNo || !m.year || !m.phone || !m.email) {
            return showToast(`Please fill all fields for ${i === 0 ? 'the Leader' : 'Member ' + id}.`, "error");
        }
        if (m.rollNo.length !== 12) {
            return showToast(`Invalid Roll Number for ${m.name}. Must be exactly 12 characters.`, "error");
        }
        if (m.phone.length !== 10) {
            return showToast(`Invalid Phone Number for ${m.name}. Must be exactly 10 digits.`, "error");
        }

        teamData.members.push(m);
    }

    btn.textContent = "Processing Flight Plan...";
    btn.disabled = true;

    try {
        const result = await registerTeam(teamData);
        if (result.success) {
            showToast("Registration Successful! Welcome aboard.", "success");
            closeModal();
            currentTeamData = result.data;
            renderTeamDashboard(currentTeamData);
            window.showPage('page-team-dashboard');
        } else {
            showToast(result.error, "error");
        }
    } catch (e) {
        showToast("A network error occurred.", "error");
        console.error(e);
    } finally {
        btn.textContent = "Complete Registration";
        btn.disabled = false;
    }
};

// ===== TEAM LOGIN FLOW =====
function renderTeamLoginForm() {
    return `
        <div class="modal-header">
            <h2>Passenger Login</h2>
        </div>
        <div class="form-section">
            <div class="input-group">
                <label>Team Username</label>
                <input type="text" id="login-username" placeholder="e.g. team_innovate">
            </div>
            <div class="input-group">
                <label>Password</label>
                <input type="password" id="login-password" placeholder="••••••••" onkeydown="if(event.key==='Enter') verifyTeamLogin()">
            </div>
            <button class="btn-primary w-full mt-2" onclick="verifyTeamLogin()" id="btn-team-login">Access Portal</button>
        </div>
    `;
}

window.verifyTeamLogin = async function() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-team-login');

    if (!user || !pass) {
        return showToast("Please enter both username and password.", "error");
    }

    btn.textContent = "Authenticating...";
    btn.disabled = true;

    try {
        const result = await loginTeam(user, pass);
        if (result.success) {
            closeModal();
            showToast(`Welcome aboard, ${result.data.displayName}!`, "success");
            currentTeamData = result.data;
            renderTeamDashboard(currentTeamData);
            window.showPage('page-team-dashboard');
        } else {
            showToast(result.error, "error");
        }
    } catch (e) {
        showToast("Login failed. Please check your connection.", "error");
        console.error(e);
    } finally {
        btn.textContent = "Access Portal";
        btn.disabled = false;
    }
};

// ===== ADMIN LOGIN FLOW =====
function renderAdminLoginForm() {
    return `
        <div class="modal-header">
            <h2>Flight Control Access</h2>
        </div>
        <div class="form-section">
            <div class="input-group">
                <label>Clearance Code</label>
                <input type="password" id="admin-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter') verifyAdmin()">
            </div>
            <button class="btn-primary w-full mt-2" onclick="verifyAdmin()">Access Terminal</button>
        </div>
    `;
}

window.verifyAdmin = function() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'avaneesh2006') {
        closeModal();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-admin').classList.add('active');
        showToast("Access Granted: Welcome to Flight Control", "success");
        renderAdminDashboard();
    } else {
        showToast("Access Denied: Invalid Clearance", "error");
    }
};

window.logout = function() {
    currentTeamData = null;
    window.showPage('page-landing');
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
    showToast("Logged out", "info");
};

// ===== TEAM DASHBOARD RENDERER =====
function renderTeamDashboard(team) {
    if (!team) return;

    const section = document.querySelector('#page-team-dashboard .hero');
    if (!section) return;

    const memberRows = (team.members || []).map((m, i) => {
        const role = i === 0 ? '✈️ Pilot (Leader)' : `👤 Passenger ${i + 1}`;
        return `
            <div class="td-member-row">
                <div class="td-member-role">${role}</div>
                <div class="td-member-name">${m.name}</div>
                <div class="td-member-meta">${m.college} &nbsp;·&nbsp; Year ${m.year} &nbsp;·&nbsp; ${m.rollNo}</div>
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="hero-content" style="width:100%; max-width: 720px;">
            <div class="tagline fade-up">STATUS: <span style="color: var(--text-main);">CHECKED IN ✓</span></div>

            <div class="hero-logo-center fade-up delay-1" style="margin-bottom: 1.5rem;">
                <h1 class="main-logo-text" style="font-size: 3.5rem; text-align: center;">${(team.displayName || team.teamName || '').toUpperCase()}</h1>
            </div>

            <p class="hero-subtitle fade-up delay-2" style="margin-bottom: 2.5rem;">
                Flight <strong style="color:var(--text-main);">RNWY-2026</strong> &nbsp;·&nbsp; Boarding confirmed &nbsp;·&nbsp; Gate opens <strong style="color:var(--text-main);">March 26</strong>
            </p>

            <div class="td-boarding-pass fade-up delay-2">
                <div class="td-bp-header">
                    <span class="td-bp-label">BOARDING PASS</span>
                    <span class="td-bp-flight">RNWY-2026</span>
                </div>
                <div class="td-bp-divider"></div>
                <div class="td-members-list">${memberRows}</div>
                <div class="td-bp-divider"></div>
                <div class="td-bp-footer">
                    <div class="td-bp-info-cell">
                        <div class="td-bp-info-label">PASSENGER COUNT</div>
                        <div class="td-bp-info-value">${(team.members || []).length}</div>
                    </div>
                    <div class="td-bp-info-cell">
                        <div class="td-bp-info-label">GATE</div>
                        <div class="td-bp-info-value">TBD</div>
                    </div>
                    <div class="td-bp-info-cell">
                        <div class="td-bp-info-label">SEAT CLASS</div>
                        <div class="td-bp-info-value">STARTUP</div>
                    </div>
                    <div class="td-bp-info-cell">
                        <div class="td-bp-info-label">DEPARTS</div>
                        <div class="td-bp-info-value">26 MAR</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
