// ===== APP INIT =====

document.addEventListener('DOMContentLoaded', () => {
    // Seed demo data on first load
    seedDemoData();

    // Update landing page stats
    updateLandingStats();

    // Refresh stats every 5 seconds (simulating real-time)
    setInterval(() => {
        if (document.getElementById('page-landing').classList.contains('active')) {
            updateLandingStats();
        }
        // Auto-refresh dashboards if logged in
        if (currentUser && document.getElementById('page-audience').classList.contains('active')) {
            // Soft refresh - only update token count and round status
            const freshUser = getUserById(currentUser.id);
            if (freshUser) {
                currentUser = freshUser;
                // Only re-render if on home view to avoid disrupting team detail
                if (audienceView === 'home') {
                    renderAudienceDashboard(currentUser);
                }
            }
        }
    }, 8000);

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

    // Animate stats on landing
    animateStats();
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

// getDB, DB_KEY, DEFAULT_DATA are all defined in data.js (loaded first)
