import { db, doc, setDoc, onSnapshot, collection } from './firebase-config.js';
import { AppState } from './state.js';
import { setupUI } from './ui.js';
import { setupSecurity } from './security.js';
import { setupReviewer, autoFillPreviousUserInputs } from './reviewer.js';
import { setupModerator, loadCurrentStoryNotes } from './moderator.js';
import { setupDeveloper } from './developer.js';

export function evaluateSetupFlow() {
    if (AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return; 
    const isLocked = AppState.isNameLockedByMod;
    document.getElementById('inputModName').disabled = isLocked;
    document.getElementById('saveModNameBtn').disabled = isLocked;
    document.getElementById('inputTopic').disabled = !isLocked;
    document.getElementById('inputMonth').disabled = !isLocked;
    document.getElementById('startSeasonBtn').disabled = !isLocked || AppState.isSeasonStarted;
    
    if (isLocked && AppState.isSeasonStarted) {
        document.getElementById('advancedModOptions').classList.remove('hidden');
    } else {
        document.getElementById('advancedModOptions').classList.add('hidden');
    }
}

export function evaluateLocalStorageRestrictions() {
    if (AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
    const targetStory = document.getElementById('storyDropdown').value;
    if (!targetStory) return;

    if (AppState.isDeveloperModeUnlocked) {
        document.getElementById('friendName').disabled = false;
        document.getElementById('ratingValue').disabled = false;
        document.getElementById('authorGuess').disabled = false;
        document.getElementById('titleSuggestion').disabled = false;
        document.getElementById('submitRatingBtn').disabled = false;
        document.getElementById('submitRatingBtn').textContent = "Submit Review (Dev Mode Bypass)";
        return;
    }
    
    const createdDateStr = new Date(AppState.arrayedStoriesList.find(s => s.id === targetStory)?.created || 0).toDateString();
    const isPreviousDay = createdDateStr !== new Date().toDateString();
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const pastAuthor = timeStr > AppState.cachedAuthorGuessLockTime;
    const pastTitle = timeStr > AppState.cachedTitleSuggestionLockTime;

    const hasRated = localStorage.getItem(`rated_${targetStory}`) === "true";
    let alreadyGuessedAuthor = false, alreadySuggestedTitle = false;

    if (hasRated) {
        const storedUserData = localStorage.getItem(`userdata_${targetStory}`);
        if (storedUserData) {
            try {
                const p = JSON.parse(storedUserData);
                alreadyGuessedAuthor = p.authorGuess && p.authorGuess !== "None";
                alreadySuggestedTitle = p.suggestedTitle && p.suggestedTitle !== "None";
            } catch(e) {}
        }
    }

    document.getElementById('friendName').disabled = hasRated;
    document.getElementById('ratingValue').disabled = hasRated;
    document.getElementById('authorGuess').disabled = !AppState.isAuthorGuessEnabled || alreadyGuessedAuthor || isPreviousDay || pastAuthor;
    document.getElementById('titleSuggestion').disabled = !AppState.isTitleSuggestionEnabled || alreadySuggestedTitle || isPreviousDay || pastTitle;

    const btn = document.getElementById('submitRatingBtn');
    if (document.getElementById('friendName').disabled && document.getElementById('authorGuess').disabled && document.getElementById('titleSuggestion').disabled) {
        btn.disabled = true;
        btn.textContent = (isPreviousDay && hasRated) ? "Ratings locked" : (hasRated && (pastAuthor || pastTitle)) ? "Time expired" : "Review Submitted";
    } else {
        btn.disabled = false;
        btn.textContent = hasRated ? "Update Suggestions" : "Submit Review";
    }
}

export function evaluateSystemFreezeState() {
    const elements = [
        document.getElementById('friendName'), document.getElementById('ratingValue'), document.getElementById('authorGuess'), document.getElementById('titleSuggestion'),
        document.getElementById('dashboardNewStoryInput'), document.getElementById('dashboardUpdateStoryBtn'), document.getElementById('deleteStorySelect'), document.getElementById('deleteStoryBtn'),
        document.getElementById('inputMonth'), document.getElementById('inputTopic'), document.getElementById('startSeasonBtn'), document.getElementById('readerSuggestions'),
        document.getElementById('toggleAuthorGuessBtn'), document.getElementById('toggleTitleSuggestionBtn'), document.getElementById('authorGuessLockTime'), document.getElementById('titleSuggestionLockTime'),
        document.getElementById('headingSuggesterInput'), document.getElementById('correctGuesses'), document.getElementById('saveNotesBtn'), document.getElementById('clearWinnersBtn'),
        document.getElementById('updateLockTimesBtn'), document.getElementById('previewBtn'), document.getElementById('downloadBtn'), document.getElementById('goToFeedbackBtn'),
        document.getElementById('submitFeedbackBtn'), document.getElementById('feedbackNameInput'), document.getElementById('authorGivenHeadingInput'),
        document.getElementById('btnUpdateMajor'), document.getElementById('btnUpdateMinor'), document.getElementById('btnUpdateRevision')
    ];

    if (AppState.isSystemPaused) {
        document.getElementById('pausedBanner').classList.remove('hidden');
        if(document.getElementById('exclusiveModeText')) document.getElementById('exclusiveModeText').style.color = "var(--danger)";
        document.getElementById('submitRatingBtn').disabled = true;
        document.getElementById('submitRatingBtn').textContent = "System Paused";
        
        elements.forEach(el => { if(el) el.disabled = !AppState.isDeveloperModeUnlocked; });
        document.getElementById('inputModName').disabled = AppState.isDeveloperModeUnlocked ? AppState.isNameLockedByMod : true;
        document.getElementById('saveModNameBtn').disabled = AppState.isDeveloperModeUnlocked ? AppState.isNameLockedByMod : true;
    } else {
        document.getElementById('pausedBanner').classList.add('hidden');
        if(document.getElementById('exclusiveModeText')) document.getElementById('exclusiveModeText').style.color = "#FFFFFF";
        elements.forEach(el => { if(el) el.disabled = false; });
        evaluateSetupFlow();
        evaluateLocalStorageRestrictions();
    }
}

function updateSeasonDropdowns(seasonsSet) {
    const pSelect = document.getElementById('previewSeasonSelect');
    const dSelect = document.getElementById('downloadSeasonSelect');
    const pVal = pSelect.value;
    const dVal = dSelect.value;

    let optionsHtml = '<option value="All">All Seasons</option>';
    if (AppState.globalSeasonCache && AppState.globalSeasonCache !== "---" && !seasonsSet.has(AppState.globalSeasonCache)) {
        optionsHtml += `<option value="${AppState.globalSeasonCache}">${AppState.globalSeasonCache}</option>`;
    }
    seasonsSet.forEach(s => { if(s && s !== "Legacy" && s !== "All") optionsHtml += `<option value="${s}">${s}</option>`; });

    pSelect.innerHTML = optionsHtml;
    dSelect.innerHTML = optionsHtml;

    if ([...seasonsSet, "All", AppState.globalSeasonCache].includes(pVal)) pSelect.value = pVal;
    if ([...seasonsSet, "All", AppState.globalSeasonCache].includes(dVal)) dSelect.value = dVal;
}

document.addEventListener('DOMContentLoaded', () => {
    const { toggleMenu } = setupUI(AppState);
    setupSecurity();
    setupReviewer();
    setupModerator(toggleMenu);
    setupDeveloper(toggleMenu);

    document.getElementById('updateLockTimesBtn').addEventListener('click', async () => {
        if (AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        try {
            await setDoc(doc(db, "app_state", "global_config"), {
                authorGuessLockTime: document.getElementById('authorGuessLockTime').value.trim() || "23:59",
                titleSuggestionLockTime: document.getElementById('titleSuggestionLockTime').value.trim() || "23:59"
            }, { merge: true });
        } catch(e) {}
    });

    document.getElementById('toggleAuthorGuessBtn').addEventListener('change', async (e) => {
        if (AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        await setDoc(doc(db, "app_state", "global_config"), { enableAuthorGuess: e.target.checked }, { merge: true });
    });

    document.getElementById('toggleTitleSuggestionBtn').addEventListener('change', async (e) => {
        if (AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        await setDoc(doc(db, "app_state", "global_config"), { enableTitleSuggestion: e.target.checked }, { merge: true });
    });

    onSnapshot(doc(db, "app_state", "global_config"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('topicDisplay').textContent = data.topic || "*****";
            document.getElementById('monthDisplay').textContent = data.month || "*****";
            document.getElementById('inputMonth').value = data.month || "";
            document.getElementById('inputTopic').value = data.topic || "";

            AppState.globalSeasonCache = data.seasonName || "---";
            document.getElementById('sidebarSeasonDisplay').textContent = AppState.globalSeasonCache;

            AppState.currentModName = data.modName || "Mod";
            document.getElementById('headerModNameDisplay').textContent = `Moderator: ${AppState.currentModName}`;
            document.getElementById('inputModName').value = AppState.currentModName;

            AppState.isAuthorGuessEnabled = !!data.enableAuthorGuess;
            AppState.isTitleSuggestionEnabled = !!data.enableTitleSuggestion;
            document.getElementById('toggleAuthorGuessBtn').checked = AppState.isAuthorGuessEnabled;
            document.getElementById('toggleTitleSuggestionBtn').checked = AppState.isTitleSuggestionEnabled;
            
            AppState.cachedAuthorGuessLockTime = data.authorGuessLockTime || "23:59";
            AppState.cachedTitleSuggestionLockTime = data.titleSuggestionLockTime || "23:59";
            
            if (document.activeElement !== document.getElementById('authorGuessLockTime')) document.getElementById('authorGuessLockTime').value = AppState.cachedAuthorGuessLockTime;
            if (document.activeElement !== document.getElementById('titleSuggestionLockTime')) document.getElementById('titleSuggestionLockTime').value = AppState.cachedTitleSuggestionLockTime;
            
            if (AppState.isAuthorGuessEnabled) document.getElementById('userAuthorGuessGroup').classList.remove('hidden');
            else { document.getElementById('userAuthorGuessGroup').classList.add('hidden'); document.getElementById('authorGuess').value = ""; }

            if (AppState.isTitleSuggestionEnabled) document.getElementById('userTitleSuggestionGroup').classList.remove('hidden');
            else { document.getElementById('userTitleSuggestionGroup').classList.add('hidden'); document.getElementById('titleSuggestion').value = ""; }

            AppState.isNameLockedByMod = !!data.isNameLocked;
            AppState.isSeasonStarted = !!data.seasonStarted;
            AppState.isSystemPaused = !!data.systemPaused;
            document.getElementById('devPauseToggle').checked = AppState.isSystemPaused;
            
            evaluateSystemFreezeState();
        }
    });

    onSnapshot(doc(db, "app_state", "version_control"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            AppState.currentVersionState.major = data.major || 4;
            AppState.currentVersionState.minor = data.minor || 1;
            AppState.currentVersionState.revision = data.revision || 7;
            AppState.currentVersionState.changesMade = Array.isArray(data.changesMade) ? data.changesMade : [];
            document.getElementById('devMajorText').textContent = AppState.currentVersionState.major;
            document.getElementById('devMinorText').textContent = AppState.currentVersionState.minor;
            document.getElementById('devRevisionText').textContent = AppState.currentVersionState.revision;
        }
    });

    onSnapshot(collection(db, "competitions"), (snapshot) => {
        AppState.arrayedStoriesList = [];
        let uniqueSeasons = new Set();

        snapshot.forEach(doc => {
            const d = doc.data();
            AppState.arrayedStoriesList.push({ id: doc.id, created: d.created || 0, season: d.season || "Legacy" });
            if (d.season) uniqueSeasons.add(d.season);
        });

        updateSeasonDropdowns(uniqueSeasons);
        AppState.arrayedStoriesList.sort((a, b) => b.created - a.created);

        document.getElementById('storyDropdown').innerHTML = "";
        document.getElementById('deleteStorySelect').innerHTML = "";

        AppState.arrayedStoriesList.forEach(storyObj => {
            const opt1 = document.createElement('option'); opt1.value = storyObj.id; opt1.textContent = storyObj.id; 
            document.getElementById('storyDropdown').appendChild(opt1);
            const opt2 = document.createElement('option'); opt2.value = storyObj.id; opt2.textContent = storyObj.id;
            document.getElementById('deleteStorySelect').appendChild(opt2);
        });

        if(AppState.arrayedStoriesList.length > 0) {
            if(!document.getElementById('storyDropdown').value) document.getElementById('storyDropdown').selectedIndex = 0;
            if(!document.getElementById('deleteStorySelect').value) document.getElementById('deleteStorySelect').selectedIndex = 0;
            loadCurrentStoryNotes();
            autoFillPreviousUserInputs();
        } else {
            document.getElementById('dailyReviewsTableBody').innerHTML = `<tr><td colspan="4" style="text-align: center; font-style: italic; padding: 15px;">Select a story to load submissions</td></tr>`;
        }
        evaluateLocalStorageRestrictions();
    });
});
