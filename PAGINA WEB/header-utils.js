// Cargar tema guardado
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnNotifications = document.getElementById('btn-notifications');
    const btnSettings = document.getElementById('btn-settings');
    const settingsMenu = document.getElementById('settings-menu');
    const notifModal = document.getElementById('notif-modal');
    
    if (btnNotifications) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifModal) notifModal.classList.remove('hidden');
        });
    }
    
    if (btnSettings) {
        btnSettings.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('hidden');
        });
    }
    
    document.addEventListener('click', () => {
        if (settingsMenu && !settingsMenu.classList.contains('hidden')) {
            settingsMenu.classList.add('hidden');
        }
    });
});

function closeNotifModal() {
    document.getElementById('notif-modal').classList.add('hidden');
}
