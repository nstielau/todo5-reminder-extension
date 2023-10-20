export function getInProgressEvents(events, mutedEventsIds) {
    // Look 2 mins ino the future
    const now = new Date(Date.now() + 2*60*1000);

    return events.filter(event => {
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
        if (event.attendees) {
            event.attendees.forEach((attendee, i) => {
                if (attendee.self) {
                    if (attendee.responseStatus == "declined") {
                        return false;
                    }
                }
            });
        }
        const eventStartTime = new Date(event.start.dateTime);
        const eventEndTime = new Date(event.end.dateTime);
        return eventStartTime < now && eventEndTime > now;
    });
}