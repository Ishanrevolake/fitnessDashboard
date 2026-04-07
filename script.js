// Data simulation for charts and stats
const chartData = {
    weight: [75.2, 75.0, 74.8, 74.9, 74.6, 74.4],
    sleep: [7.2, 6.8, 7.5, 6.5, 7.0, 6.96], // in hours
    hr: [70, 68, 69, 67, 66, 66],
    steps: [8500, 9200, 7800, 10500, 11000, 9650]
};

// Initialize charts (simulated with SVG or CSS for lightweight performance)
function initCharts() {
    const charts = ['weight', 'sleep', 'hr', 'steps'];
    
    charts.forEach(chartId => {
        const container = document.getElementById(`${chartId}Chart`);
        if (!container) return;
        
        const data = chartData[chartId];
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        // Create a simple SVG polyline
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 80;
            const y = 40 - ((val - min) / range) * 30 - 5;
            return `${x},${y}`;
        }).join(' ');
        
        container.innerHTML = `
            <svg viewBox="0 0 80 40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="gradient-${chartId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:var(--accent-red);stop-opacity:0.2" />
                        <stop offset="100%" style="stop-color:var(--accent-red);stop-opacity:0" />
                    </linearGradient>
                </defs>
                <path d="M 0,40 ${points.split(' ').map((p, i) => i === 0 ? 'L ' + p : 'L ' + p).join(' ')} L 80,40 Z" fill="url(#gradient-${chartId})" />
                <polyline points="${points}" fill="none" stroke="var(--accent-red)" stroke-width="2" />
                <circle cx="${points.split(' ').pop().split(',')[0]}" cy="${points.split(' ').pop().split(',')[1]}" r="3" fill="var(--accent-red)" />
            </svg>
        `;
    });
}

// Interactivity for notifications and search
function initInteractivity() {
    const iconBtns = document.querySelectorAll('.circle-btn, .icon-btn');
    iconBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
        });
    });

    // Simulated real-time update
    setInterval(() => {
        const notificationDot = document.querySelector('.notification-dot');
        if (notificationDot) {
            notificationDot.style.opacity = notificationDot.style.opacity === '0' ? '1' : '0';
        }
    }, 2000);
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initInteractivity();
    
    // Log for verification
    console.log("Fitness Dashboard Initialized");
});
