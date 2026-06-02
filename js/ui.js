export function sanitizeText(str) {
    if (str === null || str === undefined) return "";
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
}

export function showCustomModal(type, message, defaultVal = "") {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const msgEl = document.getElementById('customModalMessage');
        const inputEl = document.getElementById('customModalInput');
        const btnCancel = document.getElementById('customModalCancel');
        const btnOk = document.getElementById('customModalOk');

        msgEl.innerHTML = message;
        inputEl.value = defaultVal;

        if(type === 'alert') {
            inputEl.classList.add('hidden');
            btnCancel.classList.add('hidden');
        } else if(type === 'confirm') {
            inputEl.classList.add('hidden');
            btnCancel.classList.remove('hidden');
        } else if(type === 'prompt') {
            inputEl.classList.remove('hidden');
            btnCancel.classList.remove('hidden');
        }

        overlay.classList.remove('hidden');

        const cleanup = () => {
            overlay.classList.add('hidden');
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => {
            const val = inputEl.value;
            cleanup();
            if(type === 'prompt') resolve(val);
            else if(type === 'confirm') resolve(true);
            else resolve(true);
        };

        btnCancel.onclick = () => {
            cleanup();
            if(type === 'prompt') resolve(null);
            else if(type === 'confirm') resolve(false);
            else resolve(false);
        };
    });
}

export const customAlert = (msg) => showCustomModal('alert', msg);
export const customConfirm = (msg) => showCustomModal('confirm', msg);
export const customPrompt = (msg, def) => showCustomModal('prompt', msg, def);

export function setupUI(AppState) {
    let currentTheme = localStorage.getItem('kathasagaram_theme') || 'light';
    const themeSelect = document.getElementById('themeSelect');
    
    function applyTheme() {
        if (currentTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }
        if(themeSelect) themeSelect.value = currentTheme;
    }
    applyTheme();

    function toggleMenu(show) {
        if (show) {
            document.getElementById('sideMenu').classList.add('open');
            document.getElementById('menuOverlay').classList.add('visible');
        } else {
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('menuOverlay').classList.remove('visible');
        }
    }

    document.getElementById('menuOpenBtn').addEventListener('click', () => toggleMenu(true));
    document.getElementById('menuCloseBtn').addEventListener('click', () => toggleMenu(false));
    document.getElementById('menuOverlay').addEventListener('click', () => toggleMenu(false));

    themeSelect.addEventListener('change', (e) => {
        currentTheme = e.target.value;
        localStorage.setItem('kathasagaram_theme', currentTheme);
        applyTheme();
        setTimeout(() => toggleMenu(false), 150); 
    });

    document.getElementById('navBtnReviewer').addEventListener('click', () => {
        document.getElementById('navBtnReviewer').classList.add('active-panel-indicator');
        document.getElementById('navBtnModerator').classList.remove('active-panel-indicator');
        document.getElementById('userInterface').classList.remove('hidden');
        document.getElementById('feedbackInterface').classList.add('hidden'); 
        document.getElementById('loginInterface').classList.add('hidden');
        document.getElementById('modInterface').classList.add('hidden');
        document.getElementById('devInterface').classList.add('hidden');
    });

    document.getElementById('navBtnModerator').addEventListener('click', () => {
        document.getElementById('navBtnModerator').classList.add('active-panel-indicator');
        document.getElementById('navBtnReviewer').classList.remove('active-panel-indicator');
        document.getElementById('userInterface').classList.add('hidden');
        document.getElementById('feedbackInterface').classList.add('hidden');
        if (AppState.isModeratorAuthenticated) {
            document.getElementById('modInterface').classList.remove('hidden');
            if (AppState.isDeveloperModeUnlocked) document.getElementById('devInterface').classList.remove('hidden');
            document.getElementById('loginInterface').classList.add('hidden');
        } else {
            document.getElementById('loginInterface').classList.remove('hidden');
            document.getElementById('modInterface').classList.add('hidden');
            document.getElementById('devInterface').classList.add('hidden');
        }
    });

    const initToday = new Date();
    document.getElementById('currentDateDisplay').textContent = `${String(initToday.getDate()).padStart(2, '0')}/${String(initToday.getMonth() + 1).padStart(2, '0')}/${String(initToday.getFullYear()).slice(-2)}`;
    
    return { toggleMenu };
}
