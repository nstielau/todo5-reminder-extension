/**
 * @license MIT
 * (c) 2024 Nick Stielau
 * 
 * This file is part of the Todo5 Reminder extension.
 * Licensed under the MIT License.
 */

document.addEventListener('DOMContentLoaded', function () {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const calendarIdsTextarea = document.getElementById('calendarIds');
        const saveButton = document.getElementById('saveButton');

        // Load saved calendar IDs
        chrome.storage.sync.get('calendarIds', (data) => {
            if (data.calendarIds) {
                calendarIdsTextarea.value = data.calendarIds.join('\n');
            }
        });

        // Save calendar IDs
        saveButton.addEventListener('click', () => {
            const calendarIds = calendarIdsTextarea.value.split('\n').map(id => id.trim()).filter(id => id);
            chrome.storage.sync.set({ calendarIds }, () => {
                alert('Calendar IDs saved!');
            });
        });
    } else {
        console.error('Chrome storage API is not available. Make sure you are running this in a Chrome extension context.');
    }
});
