import {
    getUserById,
    getGlobalStats
} from './data.js';
import {
    currentUser,
    closeModal,
    updateLandingStats
} from './auth.js';
import { renderAudienceDashboard } from './audience-dashboard.js';
import { renderTeamDashboard } from './team-dashboard.js';
import { renderAdminDashboard } from './admin-dashboard.js';


// ===== APP INIT =====

document.addEventListener('DOMContentLoaded', () => {
    // Initial UI update
    updateLandingStats();

    // Animate stats on landing
    animateStats();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Enter key on modal inputs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('modal-overlay').classList.contains('open')) {
            const btn = document.querySelector('#modal-content .btn-primary');
            if (btn) btn.click();
        }
    });

    // Note: Most UI updates are now handled by Firestore's onSnapshot listeners
    // which call updateUI() in data.js.
});

function animateStats() {
    const stats = getGlobalStats();
    animateNumber('stat-teams', 0, stats.teamCount, 800);
    animateNumber('stat-investors', 0, stats.investorCount, 1000);
    animateNumber('stat-tokens', 0, stats.totalTokens, 1200);
}

function animateNumber(id, from, to, duration) {
    const el = document.getElementById(id);
    if (!el || to === 0) return;
    const start = performance.now();
    const update = (time) => {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (to - from) * eased);
        el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

window.animateStats = animateStats;
window.animateNumber = animateNumber;
