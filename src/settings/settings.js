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
        const nonIgnoreableEventSubstringsTextarea = document.getElementById('nonIgnoreableEventSubstrings');
        const saveButton = document.getElementById('saveButton');

        // Load saved non-ignorable events
        chrome.storage.sync.get('nonIgnoreableEventSubstrings', (data) => {
            if (data.nonIgnoreableEventSubstrings) {
                nonIgnoreableEventSubstringsTextarea.value = data.nonIgnoreableEventSubstrings.join('\n');
            }
        });

        // Load saved calendar IDs
        chrome.storage.sync.get('calendarIds', (data) => {
            if (data.calendarIds) {
                calendarIdsTextarea.value = data.calendarIds.join('\n');
            }
        });

        // Save calendar IDs
        saveButton.addEventListener('click', () => {
            const calendarIds = calendarIdsTextarea.value.split('\n').map(id => id.trim()).filter(id => id);
            const nonIgnoreableEventSubstrings = nonIgnoreableEventSubstringsTextarea.value.split('\n').map(event => event.trim()).filter(event => event);
            chrome.storage.sync.set({ calendarIds, nonIgnoreableEventSubstrings }, () => {
                alert('Settings saved!');
            });
        });
    } else {
        console.error('Chrome storage API is not available. Make sure you are running this in a Chrome extension context.');
    }
});
