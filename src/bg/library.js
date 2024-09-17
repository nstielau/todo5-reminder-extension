/**
 * Filters and returns events that are currently in progress.
 * Excludes events that are muted, cancelled, or declined by the user.
 *
 * @param {Array} events - List of calendar events.
 * @param {Object} mutedEventsIds - Dictionary of muted event IDs.
 * @returns {Array} - List of in-progress events.
 */
export function getInProgressEvents(events, mutedEventsIds) {
    // Look 2 mins into the future
    const now = new Date(Date.now() + 2 * 60 * 1000);

    return events.filter(event => {
        if (event.status == "cancelled") {
            return false;
        }
        if (!event || !event.start || !event.end) {
            console.warn("In-progress event apparently without start or end", event);
            return false;
        }
        if (event.attendees?.some(attendee => attendee.self && attendee.responseStatus === "declined")) {
            return false;
        }
        const eventStartTime = new Date(event.start.dateTime);
        const eventEndTime = new Date(event.end.dateTime);
        return eventStartTime < now && eventEndTime > now;
    });
}
