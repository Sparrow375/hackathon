import { getAllTeams, deleteTeam, getRegistrationStatus, setRegistrationStatus } from './data.js';

let currentTeamsData = []; // Store for Excel export

export async function renderAdminDashboard() {
    const root = document.getElementById('admin-dashboard-root');
    root.innerHTML = `<div class="p-8"><p>Loading passenger manifests...</p></div>`;

    try {
        const [teams, regStatus] = await Promise.all([getAllTeams(), getRegistrationStatus()]);
        currentTeamsData = teams;
        const isOpen = regStatus.isOpen !== false;
        
        let html = `
            <div class="admin-container">
                <div class="admin-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <h2>Passenger Manifests (${currentTeamsData.length} Teams Registered)</h2>
                    <div style="display:flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                        <button class="btn-outline" onclick="exportToExcel()">📥 Download Excel</button>
                        <button class="btn-outline" onclick="renderAdminDashboard()">🔄 Refresh</button>
                    </div>
                </div>

                <!-- Registration Status Toggle -->
                <div class="reg-status-panel" style="display:flex; align-items:center; justify-content:space-between; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 1.25rem 1.75rem; margin-bottom: 2rem; background: var(--bg-card);">
                    <div>
                        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted); margin-bottom: 0.3rem;">Gate Status</div>
                        <div id="reg-status-label" style="font-size: 1.1rem; font-weight: 700; letter-spacing: 0.5px; color: ${isOpen ? '#ffffff' : '#888888'};">
                            ${isOpen ? '✈️&nbsp; Registrations OPEN' : '🚫&nbsp; Registrations CLOSED'}
                        </div>
                    </div>
                    <button id="reg-toggle-btn" class="${isOpen ? 'btn-outline' : 'btn-primary'}" onclick="toggleRegistrations()" style="min-width: 180px;">
                        ${isOpen ? 'Close Registrations' : 'Open Registrations'}
                    </button>
                </div>

                
                <div class="teams-list">
        `;

        if (currentTeamsData.length === 0) {
            html += `<p class="empty-state">No teams have registered for the runway yet.</p>`;
        } else {
            currentTeamsData.forEach((team, index) => {
                html += `
                    <div class="team-list-item" style="border: 1px solid var(--border-light); margin-bottom: 1rem; border-radius: var(--radius-sm); background: var(--bg-card); overflow: hidden;">
                        
                        <!-- Header Row -->
                        <div class="team-list-header" onclick="toggleTeamDetails('${team.id}')" style="cursor: pointer; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
                            <div>
                                <h3 style="margin: 0; display: inline-block; margin-right: 1rem;">${team.teamName.toUpperCase()}</h3>
                                <span class="badge" style="color: var(--text-muted); font-size: 0.9rem;">@${team.username} | ${team.members ? team.members.length : 0} Members</span>
                            </div>
                            <div style="display:flex; gap: 1rem; align-items: center;">
                                <button class="btn-text text-danger" onclick="event.stopPropagation(); promptDeleteTeam('${team.id}', '${team.displayName}')">Delete</button>
                                <span id="icon-${team.id}">▼</span>
                            </div>
                        </div>

                        <!-- Expandable Details -->
                        <div id="details-${team.id}" class="team-list-details" style="display: none; padding: 1.5rem; border-top: 1px solid var(--border-light);">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                `;

                if (team.members) {
                    team.members.forEach((m, i) => {
                        const role = i === 0 ? "Pilot (Leader)" : `Passenger ${i+1}`;
                        html += `
                            <div class="member-info" style="background: var(--bg-dark); padding: 1rem; border-radius: 4px;">
                                <strong style="display:block; margin-bottom:0.5rem;">${m.name} <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: normal;"> - ${role}</span></strong> 
                                <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
                                    <div>🎓 ${m.college} - Year ${m.year}</div>
                                    <div>📄 Roll: ${m.rollNo}</div>
                                    <div>📞 ${m.phone}</div>
                                    <div>✉️ ${m.email}</div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html += `<div>No members found.</div>`;
                }

                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
        
        root.innerHTML = html;

    } catch (error) {
        root.innerHTML = `<div class="p-8 text-danger"><p>Error loading manifests.</p></div>`;
        console.error(error);
    }
}

// Ensure it's available globally early
window.renderAdminDashboard = renderAdminDashboard;

window.toggleRegistrations = async function() {
    const btn = document.getElementById('reg-toggle-btn');
    const label = document.getElementById('reg-status-label');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

    // Determine current state from label text
    const currentlyOpen = label && label.textContent.includes('OPEN');
    const newState = !currentlyOpen;

    const result = await setRegistrationStatus(newState);
    if (result.success) {
        window.showToast(newState ? '✈️ Registrations are now OPEN' : '🚫 Registrations are now CLOSED', 'success');
        // Re-render to reflect new state
        renderAdminDashboard();
    } else {
        window.showToast('Failed to update registration status.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = currentlyOpen ? 'Close Registrations' : 'Open Registrations'; }
    }
};

window.toggleTeamDetails = function(teamId) {
    const detailsDiv = document.getElementById(`details-${teamId}`);
    const iconSpan = document.getElementById(`icon-${teamId}`);
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        iconSpan.textContent = '▲';
    } else {
        detailsDiv.style.display = 'none';
        iconSpan.textContent = '▼';
    }
};


window.exportToExcel = function() {
    if (!currentTeamsData || currentTeamsData.length === 0) {
        window.showToast("No data to export", "error");
        return;
    }

    // CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Team Name,Username,Member Role,Name,College,Year,Roll No,Phone,Email\n";

    currentTeamsData.forEach(team => {
        if (team.members) {
            team.members.forEach((m, i) => {
                const role = i === 0 ? "Leader" : `Member ${i+1}`;
                // Properly escape fields that might contain commas
                const row = [
                    `"${team.displayName || team.teamName}"`,
                    `"${team.username}"`,
                    `"${role}"`,
                    `"${m.name}"`,
                    `"${m.college}"`,
                    `"${m.year}"`,
                    `"${m.rollNo}"`,
                    `"${m.phone}"`,
                    `"${m.email}"`
                ].join(",");
                csvContent += row + "\n";
            });
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "runway_teams_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.showToast("Excel spreadsheet downloaded!", "success");
};

window.promptDeleteTeam = async function(teamId, teamName) {
    const confirmed = confirm(`Are you absolutely sure you want to delete the team "${teamName}"?\n\nThis action cannot be undone.`);
    if (confirmed) {
        window.showToast(`Deleting ${teamName}...`, "info");
        const result = await deleteTeam(teamId);
        if (result.success) {
            window.showToast(`Team ${teamName} deleted successfully.`, "success");
            renderAdminDashboard(); // Refresh UI
        } else {
            window.showToast(result.error || "Failed to delete team.", "error");
        }
    }
};
