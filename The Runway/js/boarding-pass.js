/**
 * Generates a digital boarding pass image for a team member and triggers a download.
 */
export async function createAndDownloadBoardingPass(teamData, memberData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // High resolution canvas for sharp text
    const width = 800;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    // 1. Background
    ctx.fillStyle = '#1c2d3d'; // Deep teal
    ctx.fillRect(0, 0, width, height);

    // 2. Borders and Perforations (Aesthetic)
    ctx.strokeStyle = '#f97316'; // Orange
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Decorative dotted line / perforation
    ctx.setLineDash([15, 15]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // 3. Typography Setup
    ctx.textAlign = 'left';
    
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px "Space Grotesk", sans-serif';
    ctx.fillText('THE RUNWAY 2026', 60, 100);

    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 30px ' + '"Space Grotesk", sans-serif';
    ctx.fillText('BOARDING PASS', 60, 140);

    // Main Details Area
    ctx.fillStyle = '#94a3b8'; // Muted text for labels
    ctx.font = 'semibold 24px "Outfit", sans-serif';
    
    // Row 1
    ctx.fillText('PASSENGER NAME', 60, 250);
    ctx.fillText('COLLEGE', 400, 250);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 45px "Space Grotesk", sans-serif';
    ctx.fillText(memberData.name.toUpperCase(), 60, 300);
    ctx.fillText(memberData.college.toUpperCase(), 400, 300);

    // Row 2
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'semibold 24px "Outfit", sans-serif';
    ctx.fillText('TEAM NAME', 60, 400);
    ctx.fillText('FLIGHT', 400, 400);

    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 40px "Space Grotesk", sans-serif';
    ctx.fillText(teamData.teamName.toUpperCase(), 60, 450);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RNWY-2026', 400, 450);

    // Row 3
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'semibold 24px "Outfit", sans-serif';
    ctx.fillText('DEPARTURE', 60, 550);
    ctx.fillText('CLASS', 400, 550);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 35px "Outfit", sans-serif';
    ctx.fillText('26 MAR 2026', 60, 600);
    ctx.fillText('ENTREPRENEUR', 400, 600);

    // Bottom Stub
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'semibold 20px "Outfit", sans-serif';
    ctx.fillText('ROLL NO: ' + memberData.rollNo, 60, height * 0.75 + 50);
    ctx.fillText('SCAN AT GATE', 60, height * 0.75 + 180);

    // Fake Barcode (Decorative)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
        const barWidth = Math.random() * 6 + 2;
        ctx.fillRect(400 + (i * 8), height * 0.75 + 50, barWidth, 150);
    }
    
    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Runway26_Pass_${memberData.name.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
}
