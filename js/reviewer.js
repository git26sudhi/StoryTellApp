import { db, doc, setDoc, arrayUnion } from './firebase-config.js';
import { AppState } from './state.js';
import { customAlert } from './ui.js';
import { evaluateLocalStorageRestrictions } from './main.js';

export function setupReviewer() {
    const goToFeedbackBtn = document.getElementById('goToFeedbackBtn');
    const feedbackNameInput = document.getElementById('feedbackNameInput');
    const feedbackTextInput = document.getElementById('feedbackTextInput');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    
    goToFeedbackBtn.addEventListener('click', () => {
        feedbackNameInput.value = "";
        feedbackTextInput.value = "";
        document.getElementById('userInterface').classList.add('hidden');
        document.getElementById('feedbackInterface').classList.remove('hidden');
    });

    document.getElementById('cancelFeedbackBtn').addEventListener('click', () => {
        document.getElementById('feedbackInterface').classList.add('hidden');
        document.getElementById('userInterface').classList.remove('hidden');
    });

    submitFeedbackBtn.addEventListener('click', async () => {
        if(AppState.isSystemPaused && !AppState.isDeveloperModeUnlocked) { customAlert("System Maintenance"); return; }
        
        const currentName = feedbackNameInput.value.trim();
        const feedback = feedbackTextInput.value.trim();

        if(!currentName) { customAlert("Please enter your name."); return; }
        if(!feedback) { customAlert("Feedback box cannot be empty."); return; }

        submitFeedbackBtn.disabled = true;
        try {
            await setDoc(doc(db, "app_feedback", "user_submissions"), {
                [currentName]: arrayUnion(feedback)
            }, { merge: true });
            
            customAlert("Feedback submitted successfully! Thank you for helping us improve.");
            document.getElementById('feedbackInterface').classList.add('hidden');
            document.getElementById('userInterface').classList.remove('hidden');
        } catch(e) {
            customAlert("Error submitting feedback. Check your connection.");
        }
        submitFeedbackBtn.disabled = false;
    });

    document.getElementById('storyDropdown').addEventListener('change', () => {
        evaluateLocalStorageRestrictions();
        autoFillPreviousUserInputs();
    });
}

export function autoFillPreviousUserInputs() {
    const targetStory = document.getElementById('storyDropdown').value;
    if (!targetStory) return;

    const storedUserData = localStorage.getItem(`userdata_${targetStory}`);
    if (storedUserData) {
        try {
            const parsedData = JSON.parse(storedUserData);
            document.getElementById('friendName').value = parsedData.name || "";
            document.getElementById('ratingValue').value = parsedData.score || "";
            document.getElementById('authorGuess').value = parsedData.authorGuess !== "None" ? parsedData.authorGuess : "";
            document.getElementById('titleSuggestion').value = parsedData.suggestedTitle !== "None" ? parsedData.suggestedTitle : "";
        } catch (e) {}
    } else {
        document.getElementById('ratingForm').reset();
    }
}
