import { getInProgressEvents } from './library.js';

// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();


var upcomingEvents = [];
var mutedEventsIds = {};

console.log("Initiating Todo5 Calendar Extension Service Worker")

// Fetch calendar events using the access token
function fetchCalendarEvents() {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
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
                return event.status != "cancelled";
            }).sort(function(a, b){
                return a.start.dateTime > b.start.dateTime
            });
        })
        .catch(error => {
            console.error(error);
        });
    });
}


function notifyTabsAboutInProgressEvents() {
    const inProgressEvents = getInProgressEvents(upcomingEvents, mutedEventsIds);
    if (inProgressEvents.length > 0) {
        // console.log("In progress events", inProgressEvents)
        chrome.tabs.query({active: true}, tabs => {
            console.log("Found these active tabs", tabs);
            const activeTab = tabs[0];
            if (activeTab) {
                console.log("Sending to tab '" + activeTab['title'] + "'");
                const response = chrome.tabs.sendMessage(activeTab.id, {
                    inProgressEvents: inProgressEvents
            }).then(
                function(value){console.log("Success msging tab!", value)},
                function(error){
                    // Don't reload chrome:// URLs
                    if (activeTab.url.startsWith("http")) {
                        console.log("Error msging tab, trying to reload!", error);
                        chrome.tabs.reload(activeTab.id);
                    }
                });
            }
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
  function(request, sender, sendResponse) {
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