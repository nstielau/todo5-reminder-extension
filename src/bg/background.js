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

function getInProgressEvents() {
    // Look 2 mins ino the future
    const now = new Date(Date.now() + 2*60*1000);

    return upcomingEvents.filter(event => {
        if (mutedEventsIds[event.id]) {
            return false;
        }
        if (event.status == "cancelled") {
            return false;
        }
        if (!event || !event.start || !event.end) {
            console.log("no start", event);
            return false;
        }
        const eventStartTime = new Date(event.start.dateTime);
        const eventEndTime = new Date(event.end.dateTime);
        return eventStartTime < now && eventEndTime > now;
    });
}

function notifyTabsAboutInProgressEvents() {
    const inProgressEvents = getInProgressEvents();
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
                        console.log("Error msging tab, trying to reload!", error);
                        chrome.tabs.reload(activeTab.id);
                    }
                );
            }
        });
    }
}

function debug() {
    console.log("Upcoming events", upcomingEvents);
    // upcomingEvents.forEach((event, i) => {
    //     console.log(event.summary, event.start.dateTime)
    // });
    console.log("mutedEventsIds", mutedEventsIds);
    console.log("inProgressEvents", getInProgressEvents())
}

// Check for upcoming calendar events every 5 minutes
setInterval(fetchCalendarEvents, 60*5*1000);
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