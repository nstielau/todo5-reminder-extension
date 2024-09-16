import { getInProgressEvents } from './library.js';

// Keep service worker alive
// (see https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension)
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();


const upcomingEvents = [];
const mutedEventsIds = {};

console.log("Initiating Todo5 Calendar Extension Service Worker");

// Fetch calendar events using the access token
function fetchCalendarEvents() {
    chrome.identity.getAuthToken({ 'interactive': true }, (token) => {
        const params = new URLSearchParams({
          singleEvents: "True",
          orderBy: "startTime",
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 60*60*24*1000).toISOString()
        });
        const apiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?'+params.toString();
        fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => response.json())
        .then(data => {
            upcomingEvents = data.items.filter(event => {
                return event.status !== "cancelled";
            }).sort((a, b) => a.start.dateTime > b.start.dateTime);
        })
        .catch(error => {
            console.error(error);
        });
    });
}


function notifyTabsAboutInProgressEvents() {
    const inProgressEvents = getInProgressEvents(upcomingEvents, mutedEventsIds);
    if (inProgressEvents.length > 0) {
        // Query all activen tabs
        chrome.tabs.query({active: true}, tabs => {
            console.log("Found these tabs", tabs);
            tabs.forEach(tab => {
                if (tab.url && tab.url.startsWith("http")) {  // Only message tabs with HTTP/HTTPS URLs
                    console.log(`Sending to tab '${tab.title}'`);
                    chrome.tabs.sendMessage(tab.id, {
                        inProgressEvents: inProgressEvents
                    }).then(
                        function(value) {
                            console.log("Success messaging tab!", value);
                        },
                        function(error) {
                            console.log("Error messaging tab, trying to reload!", error);
                            chrome.tabs.reload(tab.id);
                        }
                    );
                }
            });
        });
    }
}

function debug() {
    console.log("Upcoming events", upcomingEvents);
    console.log("mutedEventsIds", mutedEventsIds);
    console.log("inProgressEvents", getInProgressEvents(upcomingEvents, mutedEventsIds))
}

// Check API for upcoming calendar events every 5 minutes
setInterval(fetchCalendarEvents, 5*60*1000);
fetchCalendarEvents();

// Check for in progress events every 10 seconds
setInterval(notifyTabsAboutInProgressEvents, 10*1000);
notifyTabsAboutInProgressEvents();

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
