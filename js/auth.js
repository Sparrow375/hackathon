import {
  getTeams,
  getUserByHallTicket,
  getUserById,
  createUser,
  getGlobalStats
} from './data.js';
import {
  db,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getDocs,
  query,
  where,
  collection,
  setPersistence,
  browserSessionPersistence
} from './firebase-config.js';

// ===== AUTH MODULE =====
const ADMIN_PASSWORD = 'avaneesh2006';
const INTERNAL_DOMAIN_USER = 'user.internal';
const INTERNAL_DOMAIN_TEAM = 'team.internal';
const INTERNAL_DOMAIN_ADMIN = 'admin.internal';

let currentUser = null;
let currentTeam = null;
let isAdmin = false;

// Initialize Auth Listener
function initAuth() {
  // Set persistence to SESSION so tabs don't sync logins
  setPersistence(auth, browserSessionPersistence).catch(e => console.error(e));

  onAuthStateChanged(auth, async (user) => {

    const loader = document.getElementById('global-loader');

    if (user) {
      const email = user.email || '';
      console.log("Persistent session detected:", email);

      try {
        if (email.endsWith(INTERNAL_DOMAIN_USER)) {
          const hallTicket = email.split('@')[0];
          let dbUser = getUserByHallTicket(hallTicket);

          if (!dbUser) {
            // Fetch directly from Firestore to skip localDB sync delay
            const q = query(collection(db, 'users'), where('hallTicket', '==', hallTicket));
            const snap = await getDocs(q);
            if (!snap.empty) {
              dbUser = { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
          }

          if (dbUser) {
            currentUser = dbUser;
            showPage('audience');
            if (typeof window.renderAudienceDashboard === 'function') window.renderAudienceDashboard(currentUser);
          } else {
            console.warn("User session found but data missing in DB.");
            await signOut(auth);
            showPage('landing');
          }
        }
        else if (email.endsWith(INTERNAL_DOMAIN_TEAM)) {
          const username = email.split('@')[0];
          let team = getTeams().find(t => t.username === username);

          if (!team) {
            const q = query(collection(db, 'teams'), where('username', '==', username));
            const snap = await getDocs(q);
            if (!snap.empty) {
              team = { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
          }

          if (team) {
            currentTeam = team;
            showPage('team');
            if (typeof window.renderTeamDashboard === 'function') window.renderTeamDashboard(team);
          } else {
            console.warn("Team session found but data missing in DB.");
            await signOut(auth);
            showPage('landing');
          }
        }
        else if (email.endsWith(INTERNAL_DOMAIN_ADMIN)) {
          isAdmin = true;
          showPage('admin');
          if (typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard();
        }
      } catch (err) {
        console.error("Auth restoration error:", err);
        showPage('landing');
      }
    } else {
      console.log("No active session.");
      showPage('landing');
    }

    // Hide loader
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }
  });
}

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

async function loginAsTeam() {
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

  try {
    const email = `${username}@${INTERNAL_DOMAIN_TEAM}`;
    await signInWithEmailAndPassword(auth, email, password);
    currentTeam = team;
    closeModal();
    showPage('team');
    if (typeof window.renderTeamDashboard === 'function') window.renderTeamDashboard(team);
    showToast(`Welcome back, ${team.name}! 🚀`, 'success');
  } catch (error) {
    console.error("DEBUG - Team login error details:", {
      code: error.code,
      message: error.message,
      fullError: error
    });
    // If user doesn't exist in Auth but exists in DB, try to create it
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, `${username}@${INTERNAL_DOMAIN_TEAM}`, password);
        loginAsTeam(); // Retry login
      } catch (e) {
        showToast('Login failed. Please contact admin.', 'error');
      }
    } else {
      showToast('Login failed: ' + error.message, 'error');
    }
  }
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

async function loginAsAudience() {
  const hallTicket = document.getElementById('aud-hallticket').value.trim().toUpperCase();
  const password = document.getElementById('aud-password').value;
  const user = getUserByHallTicket(hallTicket);

  if (!user || user.password !== password) {
    showToast('Invalid credentials', 'error');
    return;
  }

  try {
    const email = `${hallTicket}@${INTERNAL_DOMAIN_USER}`;
    await signInWithEmailAndPassword(auth, email, password);
    currentUser = getUserById(user.id);
    closeModal();
    showPage('audience');
    if (typeof window.renderAudienceDashboard === 'function') window.renderAudienceDashboard(currentUser);
    showToast(`Welcome, ${user.name}! 💼`, 'success');
  } catch (error) {
    console.error("Audience login error:", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, `${hallTicket}@${INTERNAL_DOMAIN_USER}`, password);
        loginAsAudience();
      } catch (e) {
        showToast('Login failed. Please register again.', 'error');
      }
    } else {
      showToast('Login failed: ' + error.message, 'error');
    }
  }
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

async function registerAudience() {
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
  if (password.length < 6) {
    showToast('Password must be at least 6 characters (Firebase requirement)', 'error');
    return;
  }

  try {
    // 1. Create in Firestore
    const result = await createUser(hallTicket, password, name, college, section);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    // 2. Create in Firebase Auth for persistence
    const email = `${hallTicket}@${INTERNAL_DOMAIN_USER}`;
    await createUserWithEmailAndPassword(auth, email, password);

    currentUser = result;
    closeModal();
    showPage('audience');
    if (typeof window.renderAudienceDashboard === 'function') window.renderAudienceDashboard(currentUser);
    showToast(`Welcome to the arena, ${name}! 🎉`, 'success');
  } catch (error) {
    console.error("Registration error:", error);
    showToast('Registration failed: ' + error.message, 'error');
  }
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

async function loginAsAdmin() {
  const password = document.getElementById('admin-password').value;
  if (password !== ADMIN_PASSWORD) {
    showToast('Incorrect admin password', 'error');
    return;
  }

  try {
    const email = `admin@${INTERNAL_DOMAIN_ADMIN}`;
    await signInWithEmailAndPassword(auth, email, password);
    isAdmin = true;
    closeModal();
    showPage('admin');
    if (typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard();
    showToast('Admin access granted ⚡', 'success');
  } catch (error) {
    console.error("Admin login error:", error);
    // If admin auth user doesn't exist, create it once using the predefined password
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, `admin@${INTERNAL_DOMAIN_ADMIN}`, password);
        // If creation succeeds, they are automatically signed in by Firebase
        isAdmin = true;
        closeModal();
        showPage('admin');
        if (typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard();
        showToast('Admin account initialized & access granted ⚡', 'success');
      } catch (createError) {
        console.error("Admin auto-creation failed:", createError);
        showToast('Admin Access Failed: ' + createError.message, 'error');
      }
    } else {
      showToast('Admin login failed: ' + error.message, 'error');
    }
  }
}

// ===== LOGOUT =====
async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    currentTeam = null;
    isAdmin = false;
    showPage('landing');
    updateLandingStats();
    showToast('Logged out successfully', 'info');
  } catch (err) {
    console.error("Logout error:", err);
  }
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
  const teamEl = document.getElementById('stat-teams');
  const investorEl = document.getElementById('stat-investors');
  const tokenEl = document.getElementById('stat-tokens');
  const roundEl = document.getElementById('stat-round');

  if (teamEl) teamEl.textContent = stats.teamCount;
  if (investorEl) investorEl.textContent = stats.investorCount;
  if (tokenEl) tokenEl.textContent = stats.totalTokens.toLocaleString();

  const round = stats.currentRound;
  if (roundEl) {
    roundEl.textContent =
      round ? (round.status === 'live' ? `Round ${round.number} 🔴` : `Round ${round.number} (ended)`) : '—';
  }
}

// Kick off listener
initAuth();

// Attach to window
window.showModal = showModal;
window.closeModal = closeModal;
window.loginAsTeam = loginAsTeam;
window.loginAsAudience = loginAsAudience;
window.registerAudience = registerAudience;
window.loginAsAdmin = loginAsAdmin;
window.logout = logout;
window.showPage = showPage;
window.showToast = showToast;
window.updateLandingStats = updateLandingStats;
window.getAuthUser = () => currentUser;
window.getAuthTeam = () => currentTeam;
window.getIsAdmin = () => isAdmin;

export {
  currentUser, currentTeam, isAdmin,
  showModal, closeModal, loginAsTeam, loginAsAudience, registerAudience,
  loginAsAdmin, logout, showPage, showToast, updateLandingStats
};
