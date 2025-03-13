/**
 * @license MIT
 * (c) 2024 Nick Stielau
 * 
 * This file is part of the Todo5 Reminder extension.
 * Licensed under the MIT License.
 */

import { getInProgressEvents } from './library.js';

/**
 * Keeps the service worker alive by periodically calling a Chrome API.
 * See https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
 */
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();


const upcomingEvents = [];
const mutedEventsIds = {};

console.log("Initiating Todo5 Calendar Extension Service Worker");

/**
 * Fetches upcoming calendar events using the Google Calendar API.
 * Updates the list of upcoming events.
 */
function getColorMappings(token) {
    return fetch('https://www.googleapis.com/calendar/v3/colors', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => data.event || {})
    .catch(error => {
        console.error('Error fetching color mappings:', error);
        return {};
    });
}

function fetchCalendarEvents() {
    chrome.identity.getAuthToken({ 'interactive': true }, (token) => {
        chrome.storage.sync.get('calendarIds', (data) => {
            const calendarIds = ['primary', ...(data.calendarIds || [])];
            const params = new URLSearchParams({
              singleEvents: "True",
              orderBy: "startTime",
              timeMin: new Date().toISOString(),
              timeMax: new Date(Date.now() + 60*60*24*1000).toISOString()
            });

            upcomingEvents.length = 0; // Clear the array

            getColorMappings(token).then(colorMappings => {
                calendarIds.forEach(calendarId => {
                    const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`;
                    fetch(apiUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        upcomingEvents.push(...data.items.filter(event => {
                            console.log(event.summary + " :" + calendarId);
                            return event.status !== "cancelled";
                        }).map(event => {
                            event.colorValue = colorMappings[event.colorId];
                            return event;
                        }).sort((a, b) => a.start.dateTime > b.start.dateTime));
                    }).catch(error => {
                        console.error(`Error fetching events for calendar ${calendarId}:`, error);
                    });
                });
            });
        });
    });
}


/**
 * Notifies active tabs about events that are currently in progress.
 * Sends a message to each tab with the list of in-progress events.
 */
function notifyTabs() {
    const inProgressEvents = getInProgressEvents(upcomingEvents, mutedEventsIds);
    if (inProgressEvents.some(() => true)) {
        // Query all activen tabs
        chrome.tabs.query({active: true}, tabs => {
            console.log("Found these tabs", tabs);
            tabs.forEach(tab => {
                if (tab.url?.startsWith("http")) {  // Only message tabs with HTTP/HTTPS URLs
                    console.log(`Sending to tab '${tab.title}'`);
                    chrome.tabs.sendMessage(tab.id, {
                        inProgressEvents: inProgressEvents,
                        mutedEventsIds: mutedEventsIds
                    }).then(
                        function(value) {
                            console.log("Success messaging tab!", value);
                        },
                        function(error) {
                            console.warn("Could not message tab, trying to reload the tab to reconnect!", error);
                            chrome.tabs.reload(tab.id);
                        }
                    );
                }
            });
        });
    }
}

/**
 * Logs debug information about upcoming events, muted events, and in-progress events.
 */
function debug() {
    console.log("Upcoming events", upcomingEvents);
    console.log("mutedEventsIds", mutedEventsIds);
    console.log("inProgressEvents", getInProgressEvents(upcomingEvents, mutedEventsIds));
}

// Check API for upcoming calendar events every 5 minutes
setInterval(fetchCalendarEvents, 5*60*1000);
fetchCalendarEvents();

// Check for in progress events every 10 seconds
setInterval(notifyTabs, 10*1000);
notifyTabs();

// Print Debug info periodically
setInterval(debug, 10*1000);

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log(sender.tab ?
                "Recieved message from a content script:" + sender.tab.url :
                "Recieved message from the extension", request);
    if (request.mute && request.eid) {
        mutedEventsIds[request.eid] = true;
        console.log(" Muted", request.eid, mutedEventsIds);
    }
    return true;
  }
);
