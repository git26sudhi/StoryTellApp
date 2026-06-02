import { auth, signInWithEmailAndPassword, signOut } from './firebase-config.js';
import { AppState } from './state.js';
import { customAlert, customConfirm } from './ui.js';
import { evaluateSystemFreezeState, evaluateLocalStorageRestrictions } from './main.js';

export function setupSecurity() {
    const submitLoginBtn = document.getElementById('submitLoginBtn');
    const localEmailInput = document.getElementById('localEmailInput');
    const localPassInput = document.getElementById('localPassInput');
    
    function checkAndRestoreSession() {
        try {
            const savedAuth = sessionStorage.getItem('authMode');
            if (savedAuth === 'developer') {
                AppState.isModeratorAuthenticated = true;
                AppState.isDeveloperModeUnlocked = true;
                document.getElementById('sidebarModOptions').classList.remove('hidden');
                document.getElementById('navBtnModerator').click();
            } else if (savedAuth === 'moderator') {
                AppState.isModeratorAuthenticated = true;
                AppState.isDeveloperModeUnlocked = false;
                document.getElementById('sidebarModOptions').classList.remove('hidden');
                document.getElementById('navBtnModerator').click(); 
            }
        } catch (e) {}
    }
    checkAndRestoreSession();

    submitLoginBtn.addEventListener('click', async () => {
        const email = localEmailInput.value.trim();
        const password = localPassInput.value.trim();

        if (!email || !password) {
            customAlert("Please enter both email and password.");
            return;
        }

        submitLoginBtn.disabled = true;
        submitLoginBtn.textContent = "Authenticating...";

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            AppState.isModeratorAuthenticated = true;
            
            if (user.email === "dev@admin.com" || user.email === "dev@kathasagaram.com") {
                AppState.isDeveloperModeUnlocked = true;
                try { sessionStorage.setItem('authMode', 'developer'); } catch(e) {}
                customAlert("Authentication Successful (Dev)");
            } else {
                AppState.isDeveloperModeUnlocked = false;
                try { sessionStorage.setItem('authMode', 'moderator'); } catch(e) {}
                customAlert("Authentication Successful (Mod)");
            }

            document.getElementById('loginInterface').classList.add('hidden');
            document.getElementById('modInterface').classList.remove('hidden');
            document.getElementById('sidebarModOptions').classList.remove('hidden'); 
            if (AppState.isDeveloperModeUnlocked) document.getElementById('devInterface').classList.remove('hidden');

            evaluateLocalStorageRestrictions();
            evaluateSystemFreezeState();
            
            localEmailInput.value = "";
            localPassInput.value = "";
        } catch (error) {
            customAlert("Authentication failed. Please check your credentials.");
            localPassInput.value = "";
        } finally {
            submitLoginBtn.disabled = false;
            submitLoginBtn.textContent = "Unlock Control Panels";
        }
    });

    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (!(await customConfirm("Confirm Logout!"))) return;
            try {
                await signOut(auth);
                sessionStorage.removeItem('authMode'); 
            } catch(e) {}

            AppState.isModeratorAuthenticated = false;
            AppState.isDeveloperModeUnlocked = false;
            document.getElementById('sidebarModOptions').classList.add('hidden'); 
            document.getElementById('navBtnReviewer').click(); 
            evaluateLocalStorageRestrictions();
            customAlert("Logout Successful");
        });
    }
}
