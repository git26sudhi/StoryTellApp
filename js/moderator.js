import { db, doc, setDoc, getDocs, getDoc, collection } from './firebase-config.js';
import { AppState } from './state.js';
import { customAlert, customConfirm, sanitizeText } from './ui.js';

export function setupModerator(toggleMenu) {
    document.getElementById('startSeasonBtn').addEventListener('click', async () => {
        if(AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        const monthVal = document.getElementById('inputMonth').value;
        if(!monthVal) { customAlert("Please select a month to generate the season string."); return; }
        
        const generatedSeasonName = monthVal.substring(0, 3) + new Date().getFullYear().toString().slice(-2);
        try {
            await setDoc(doc(db, "app_state", "global_config"), {
                month: monthVal,
                topic: document.getElementById('inputTopic').value.trim() || "*****",
                seasonName: generatedSeasonName,
                seasonStarted: true,
                authorGuessLockTime: document.getElementById('authorGuessLockTime').value.trim() || "23:59",
                titleSuggestionLockTime: document.getElementById('titleSuggestionLockTime').value.trim() || "23:59"
            }, { merge: true });
            customAlert(`Season Configuration Saved.\nCurrent Season: ${generatedSeasonName}`);
        } catch(e) { customAlert("Database error saving variables."); }
    });
    
    document.getElementById('saveModNameBtn').addEventListener('click', async () => {
        if((AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) || AppState.isNameLockedByMod) return;
        const targetName = document.getElementById('inputModName').value.trim();
        if(!targetName || targetName === "Mod") { customAlert("Enter a valid custom signature identifier handle."); return; }
        if(!(await customConfirm(`Are you sure you want to lock the moderator name to "${targetName}"?`))) return;
        try {
            document.getElementById('saveModNameBtn').disabled = true;
            await setDoc(doc(db, "app_state", "global_config"), { modName: targetName, isNameLocked: true }, { merge: true });
            customAlert("Moderator name locked and compiled successfully.");
        } catch(e) {
            customAlert("Error processing profile modifications.");
            document.getElementById('saveModNameBtn').disabled = false;
        }
    });

    document.getElementById('dashboardUpdateStoryBtn').addEventListener('click', async () => {
        if(AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        const title = document.getElementById('dashboardNewStoryInput').value.trim();
        if (!title) { customAlert("Enter a valid story title."); return; }
        try {
            document.getElementById('dashboardUpdateStoryBtn').disabled = true;
            await setDoc(doc(db, "competitions", title), { created: Date.now(), season: AppState.globalSeasonCache }, { merge: true });
            document.getElementById('dashboardNewStoryInput').value = '';
            document.getElementById('dashboardUpdateStoryBtn').disabled = false;
            customAlert(`Added: "${title}"`);
        } catch (err) {}
    });

    document.getElementById('deleteStorySelect').addEventListener('change', () => loadCurrentStoryNotes());
    
    document.getElementById('readerSuggestions').addEventListener('change', () => {
        const val = document.getElementById('readerSuggestions').value;
        if (val && AppState.headingToReviewerMap[val]) document.getElementById('headingSuggesterInput').value = AppState.headingToReviewerMap[val];
        else document.getElementById('headingSuggesterInput').value = "";
    });
    
    document.getElementById('correctGuesses').addEventListener('change', () => {
        const val = document.getElementById('correctGuesses').value;
        if (!val) return;
        if (!AppState.accumulatedWinnersStateArray.includes(val)) {
            AppState.accumulatedWinnersStateArray.push(val);
            renderAccumulatedWinnersChips();
        }
    });

    document.getElementById('clearWinnersBtn').addEventListener('click', () => {
        if(AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) return;
        AppState.accumulatedWinnersStateArray = [];
        renderAccumulatedWinnersChips();
    });

    document.getElementById('sidebarManualBtn').addEventListener('click', () => {
        toggleMenu(false);
        const container = document.getElementById('manualContentContainer');
        const header = document.getElementById('manualHeadingTarget');
        
        if (AppState.isModeratorAuthenticated) {
            header.innerHTML = "🛠️ Moderator & Developer Manual";
            container.innerHTML = `<p style="font-size: 14px; margin-bottom: 20px; opacity: 0.85;">Administrative workflow mapping guide for moderators and system developers:</p>
            <table class="manual-table">
                <thead><tr><th style="width: 45%; text-align: center;">Feature</th><th style="text-align: center;">Description</th></tr></thead>
                <tbody>
                    <tr><td>Theme (Dropdown)</td><td class="one-sentence-def">Switches visual style sheets across light, matte, and high-saturation contrast options globally.</td></tr>
                    <tr><td>Start Season (Button)</td><td class="one-sentence-def">Commits the active subject text properties, automatically generates the season name, and unlocks moderator tools.</td></tr>
                    <tr><td>Download (Buttons)</td><td class="one-sentence-def">Compresses filtered live dataset paths into a secure spreadsheet document for local storage.</td></tr>
                </tbody>
            </table>`;
        } else {
            header.innerHTML = "📖 Reviewer User Manual";
            container.innerHTML = `<p style="font-size: 14px; margin-bottom: 20px; opacity: 0.85;">Operational guidelines for evaluating writing selections:</p>
            <table class="manual-table">
                <thead><tr><th style="width: 45%; text-align: center;">Feature</th><th style="text-align: center;">Description</th></tr></thead>
                <tbody>
                    <tr><td>Rating (1 to 10) (Input)</td><td class="one-sentence-def">Saves your numerical score evaluation for the selected composition entry inside database logs.<span class="manual-condition-text">Condition: Rating is single-vote locked.</span></td></tr>
                </tbody>
            </table>`;
        }
        document.getElementById('fullscreenManualOverlay').classList.remove('hidden');
        document.body.style.overflow = "hidden"; 
    });

    document.getElementById('manualCloseBtn').addEventListener('click', () => {
        document.getElementById('fullscreenManualOverlay').classList.add('hidden');
        document.body.style.overflow = "";
    });

    // Preview Logic
    document.getElementById('previewBtn').addEventListener('click', async () => {
        toggleMenu(false);
        document.getElementById('fullscreenPreviewOverlay').classList.remove('hidden');
        document.body.style.overflow = "hidden";
        await loadPreviewTable(); 
    });

    document.getElementById('previewCloseBtn').addEventListener('click', () => {
        document.getElementById('fullscreenPreviewOverlay').classList.add('hidden');
        document.body.style.overflow = "";
    });
    
    document.getElementById('previewSeasonSelect').addEventListener('change', loadPreviewTable);

    document.getElementById('downloadBtn').addEventListener('click', () => {
        toggleMenu(false);
        document.getElementById('downloadSeasonModal').classList.remove('hidden');
    });

    document.getElementById('cancelDownloadBtn').addEventListener('click', () => document.getElementById('downloadSeasonModal').classList.add('hidden'));

    document.getElementById('confirmDownloadBtn').addEventListener('click', async () => {
        const btn = document.getElementById('confirmDownloadBtn');
        btn.disabled = true;
        btn.textContent = "Processing...";
        try {
            const tgtSeason = document.getElementById('downloadSeasonSelect').value;
            const matrixData = await compileMasterDataMatrix(tgtSeason);
            const blob = new Blob([matrixData.rawHtmlTemplate], { type: "text/html;charset=utf-8" });
            const downloadUrl = URL.createObjectURL(blob);
            const clientLink = document.createElement("a");
            clientLink.href = downloadUrl;
            clientLink.download = `Competition_Master_Data_${tgtSeason}_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(clientLink);
            clientLink.click();
            document.body.removeChild(clientLink);
            document.getElementById('downloadSeasonModal').classList.add('hidden');
            customAlert("📊 Data payload compressed and exported securely.");
        } catch (err) {}
        btn.disabled = false;
        btn.textContent = "Download";
    });
    
    document.getElementById('dailyReviewsTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-copy-row');
        if (btn && !btn.disabled) {
            const reviewer = btn.getAttribute('data-reviewer');
            const title = btn.getAttribute('data-title');
            const copyStr = `${reviewer}, ${title}`;
            navigator.clipboard.writeText(copyStr)
                .then(() => customAlert(`📋 Copied:\n${copyStr}`))
                .catch(() => customAlert("Clipboard write blocked by browser."));
        }
    });
}

export function renderAccumulatedWinnersChips() {
    const container = document.getElementById('winnersChipsContainer');
    container.innerHTML = '';
    AppState.accumulatedWinnersStateArray.forEach(name => {
        const chip = document.createElement('div');
        chip.className = 'winner-chip';
        chip.textContent = name;
        container.appendChild(chip);
    });
    document.getElementById('correctGuesses').value = "";
}

export async function loadCurrentStoryNotes() {
    const targetSelected = document.getElementById('deleteStorySelect').value;
    const body = document.getElementById('dailyReviewsTableBody');
    if (!targetSelected) {
        body.innerHTML = `<tr><td colspan="4" style="text-align: center; font-style: italic; padding: 15px;">Select a story to load submissions</td></tr>`;
        return;
    }
    if(document.getElementById('storyDropdown').value !== targetSelected) {
        document.getElementById('storyDropdown').value = targetSelected;
    }

    try {
        const docSnap = await getDoc(doc(db, "competitions", targetSelected));
        document.getElementById('readerSuggestions').innerHTML = '<option value="">-- Title --</option>';
        document.getElementById('headingSuggesterInput').innerHTML = '<option value="">-- Name --</option>';
        document.getElementById('correctGuesses').innerHTML = '<option value="">-- Select Winner --</option>'; 

        AppState.accumulatedWinnersStateArray = [];
        AppState.headingToReviewerMap = {};
        let dailyHtml = "";
        let reviewCount = 0;

        if (docSnap.exists()) {
            const data = docSnap.data();
            AppState.activeStorySnapshotDataCache = data;

            let rawSavedHeadingMatchValue = data._suggestions || "";
            let rawSavedSuggesterMatchValue = data._suggesterName || "";
            let rawSavedAuthorGivenHeading = data._authorGivenHeading || "";

            document.getElementById('authorGivenHeadingInput').value = rawSavedAuthorGivenHeading !== "*****" ? rawSavedAuthorGivenHeading : "";
            if (data._guesses && data._guesses !== "*****") {
                AppState.accumulatedWinnersStateArray = data._guesses.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }

            Object.keys(data).forEach(reviewerKey => {
                if (!['created', '_suggestions', '_suggesterName', '_guesses', '_authorGivenHeading', 'season'].includes(reviewerKey)) {
                    reviewCount++;
                    let score = "N/A";
                    let title = "None";
                    let guess = "None";

                    if (typeof data[reviewerKey] === 'object' && data[reviewerKey] !== null) {
                        score = sanitizeText(data[reviewerKey].score ?? "N/A");
                        title = sanitizeText(data[reviewerKey].suggestedTitle || "None");
                        guess = sanitizeText(data[reviewerKey].authorGuess || "None");
                        
                        const currentTitle = data[reviewerKey].suggestedTitle ?? "";
                        const currentGuess = data[reviewerKey].authorGuess ?? "";

                        if(currentTitle && currentTitle !== "None" && currentTitle.trim() !== "") {
                            AppState.headingToReviewerMap[currentTitle] = reviewerKey;
                            const hOpt = document.createElement('option'); hOpt.value = currentTitle; hOpt.textContent = currentTitle; 
                            document.getElementById('readerSuggestions').appendChild(hOpt);
                            const pOpt = document.createElement('option'); pOpt.value = reviewerKey; pOpt.textContent = reviewerKey; 
                            document.getElementById('headingSuggesterInput').appendChild(pOpt);
                        }
                        if (currentGuess && currentGuess !== "None" && currentGuess.trim() !== "") {
                            const wOpt = document.createElement('option'); wOpt.value = reviewerKey; wOpt.textContent = reviewerKey; 
                            document.getElementById('correctGuesses').appendChild(wOpt);
                        }
                    } else {
                        score = sanitizeText(data[reviewerKey]); title = "Legacy";
                    }
                    
                    dailyHtml += `<tr>
                        <td>${sanitizeText(reviewerKey)}</td><td>${score}</td><td>${guess}</td>
                        <td>
                            <div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
                                <span style="word-break: break-word;">${title}</span>
                                <button type="button" class="btn-copy-small btn-copy-row" data-reviewer="${sanitizeText(reviewerKey).replace(/"/g, '&quot;')}" data-title="${sanitizeText(title).replace(/"/g, '&quot;')}" ${(title === "None" || title === "Legacy" || !title) ? 'style="opacity:0.3; cursor:not-allowed;" disabled' : 'style="flex-shrink: 0;"'}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>`;
                }
            });

            if(rawSavedHeadingMatchValue) document.getElementById('readerSuggestions').value = rawSavedHeadingMatchValue;
            if(rawSavedSuggesterMatchValue) document.getElementById('headingSuggesterInput').value = rawSavedSuggesterMatchValue;

            renderAccumulatedWinnersChips();
            
            if(reviewCount === 0) dailyHtml = `<tr><td colspan="4" style="text-align: center; padding: 15px; font-style: italic;">No reviews submitted for this story yet.</td></tr>`;
            body.innerHTML = dailyHtml;
        } else {
            AppState.activeStorySnapshotDataCache = null;
            renderAccumulatedWinnersChips();
            document.getElementById('authorGivenHeadingInput').value = "";
            body.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; font-style: italic;">Story data is empty or missing.</td></tr>`;
        }
    } catch(err) {
        body.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; font-style: italic; color: var(--danger);">Error loading reviews.</td></tr>`;
    }
}

export async function compileMasterDataMatrix(seasonFilter = "All") {
    const querySnapshot = await getDocs(collection(db, "competitions"));
    const currentDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    let spreadsheetStringTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"><style>table { border-collapse: collapse; width: 100%; font-family: sans-serif; } th { background-color: #2b4c7e; color: #ffffff; font-weight: bold; border: 1px solid #ccc; text-align: center; padding: 10px; } td { border: 1px solid #ccc; text-align: center; vertical-align: top; padding: 10px; } .story-heading { background-color: #4a7c59; color: white; font-size: 16px; font-weight: bold; text-align: center; padding: 12px; }</style></head>
        <body><table>`;

    let tempTableBodyContent = "";
    let stories = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const storedSeason = data.season || "Legacy";
        if (seasonFilter === "All" || seasonFilter === storedSeason) stories.push({ id: doc.id, data: data });
    });
    
    stories.sort((a, b) => (b.data.created || 0) - (a.data.created || 0));

    if (stories.length === 0) {
        const emptyMsg = `<tr><td colspan="5" style="text-align: center; padding: 20px; font-style: italic;">No records found for Season: ${seasonFilter}</td></tr>`;
        return { rawHtmlTemplate: spreadsheetStringTemplate + `</table></body></html>`, tableBodyRows: emptyMsg };
    }

    stories.forEach((story) => {
        const data = story.data;
        const storyTitle = sanitizeText(story.id);

        spreadsheetStringTemplate += `<tr><th colspan="5" class="story-heading">📖 Story: ${storyTitle}</th></tr><tr><th><b>Date</b></th><th><b>Reviewer Name</b></th><th><b>Rating</b></th><th><b>Author Guess</b></th><th><b>Suggested Title</b></th></tr>`;
        tempTableBodyContent += `<tr><th colspan="5" style="background-color: var(--primary); color: #000; font-size: 15px; text-align: center; padding: 12px; border: 1px solid var(--border);">📖 Story: ${storyTitle}</th></tr><tr><th style="background-color: var(--admin-color); color: #000; text-align: center;"><b>Date</b></th><th style="background-color: var(--admin-color); color: #000; text-align: center;"><b>Reviewer Name</b></th><th style="background-color: var(--admin-color); color: #000; text-align: center;"><b>Rating</b></th><th style="background-color: var(--admin-color); color: #000; text-align: center;"><b>Author Guess</b></th><th style="background-color: var(--admin-color); color: #000; text-align: center;"><b>Suggested Title</b></th></tr>`;

        let reviewRows = [];
        Object.keys(data).forEach(key => {
            if (!['created', '_suggestions', '_suggesterName', '_guesses', '_authorGivenHeading', 'season'].includes(key)) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    reviewRows.push({ reviewer: sanitizeText(key), score: sanitizeText(data[key].score ?? "N/A"), title: sanitizeText(data[key].suggestedTitle ?? "None"), guess: sanitizeText(data[key].authorGuess ?? "None") });
                } else {
                    reviewRows.push({ reviewer: sanitizeText(key), score: sanitizeText(data[key]), title: "Legacy", guess: "None" });
                }
            }
        });

        if (reviewRows.length === 0) {
            const emptyRow = `<tr><td colspan="5" style="text-align: center; font-style: italic; padding: 15px;">No reviews submitted yet</td></tr>`;
            spreadsheetStringTemplate += emptyRow; tempTableBodyContent += emptyRow;
        } else {
            reviewRows.forEach(review => {
                const rowHtml = `<tr><td>${currentDateStr}</td><td>${review.reviewer}</td><td>${review.score}</td><td>${review.guess}</td><td>${review.title}</td></tr>`;
                spreadsheetStringTemplate += rowHtml; tempTableBodyContent += rowHtml;
            });
        }
    });

    spreadsheetStringTemplate += `</table></body></html>`;
    return { rawHtmlTemplate: spreadsheetStringTemplate, tableBodyRows: tempTableBodyContent };
}

export async function loadPreviewTable() {
    const badge = document.getElementById('previewLoadingBadge');
    const tbody = document.getElementById('previewTableBody');
    badge.style.display = "inline";
    try {
        const tgtSeason = document.getElementById('previewSeasonSelect').value;
        const matrixData = await compileMasterDataMatrix(tgtSeason);
        tbody.innerHTML = matrixData.tableBodyRows;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error compiling data.</td></tr>`;
    } finally {
        badge.style.display = "none";
    }
}
