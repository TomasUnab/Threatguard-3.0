const { exec } = require('child_process');
const services = [
    'ThreatGuardAPI',
    'ThreatGuardSnort',
    'ThreatGuardIntegration',
    'ThreatGuardFrontend'
];

function stopAllServices() {
    services.forEach(service => {
        exec(`sc stop ${service}`);
    });
}

function startAllServices() {
    services.forEach(service => {
        exec(`sc start ${service}`);
    });
}

// Listen for process exit to stop all services
process.on('SIGINT', stopAllServices);
process.on('SIGTERM', stopAllServices);
process.on('exit', stopAllServices);

// Start all services when this script runs
startAllServices();

// Mantener el proceso vivo
setInterval(() => {}, 10000);
