/**
 * @license MIT
 * (c) 2024 Nick Stielau
 */

let readyStateCheckInterval = setInterval(() => {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        console.log("Todo5: Calendar extension registered on this page");
        const todo5_header = document.createElement("div");
        todo5_header.id = "todo5_header";
        todo5_header.addEventListener("dblclick", todo5HeaderClick);
        document.body.prepend(todo5_header);
    }
}, 100);

/**
 * Toggles the position of the todo5 header between the top and bottom of the page.
 *
 * @param {Event} event - The double-click event.
 */
function todo5HeaderClick(event) {

    const header = document.getElementById('todo5_header');
    console.log("header", header, header.style.width);
    if (header.style.bottom == "0px") {
        header.style.bottom = "auto";
    } else {
        header.style.bottom = "0px";
    }
}

/**
 * Listens for messages from the background script and updates the UI with in-progress events.
 *
 * @param {Object} message - The message received from the background script.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - Function to send a response back to the sender.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Todo5: Received message from background script', message);

    const header = document.getElementById("todo5_header");
    if (!header) {
        return;
    }

    const inProgressEvents = message['inProgressEvents'] || {};
    const mutedEventsIds = message['mutedEventsIds'] || {};

    cleanReminderBanners(inProgressEvents, mutedEventsIds);

    if (inProgressEvents && inProgressEvents.length > 0) {
        inProgressEvents.forEach(event => {
            if (!document.getElementById(event.id) && !mutedEventsIds[event.id]) {
                const eventNode = document.createElement("div");
                const h1Node = document.createElement("h1");
                h1Node.textContent = event.summary;
                eventNode.classList.add('todo5_event');
                eventNode.id = event.id;
                eventNode.dataset.eid = event.id;
                eventNode.appendChild(h1Node);
                if (event.description) {
                    const descriptionNode = document.createElement("p");
                    descriptionNode.innerHTML = event.description.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
                        // Check if the URL is already part of an <a> tag
                        return event.description.includes(`<a href="${url}`) ? url : `<a href="${url}" target="_blank">${url}</a>`;
                    });
                    eventNode.appendChild(descriptionNode);
                }
                if (event.hangoutLink) {
                    const linkNode = document.createElement("a");
                    linkNode.setAttribute('target', '_blank');
                    linkNode.setAttribute('href', event.hangoutLink);
                    linkNode.textContent = "Join Video";
                    eventNode.appendChild(linkNode);
                }

                const ignoreNode = document.createElement("a");
                ignoreNode.textContent = "Ignore";
                ignoreNode.dataset.eid = event.id;
                ignoreNode.classList.add('ignore');
                ignoreNode.addEventListener('click', (clickEvent) => {
                    console.log("Todo5: Handling click on banner");
                    document.getElementById(clickEvent.currentTarget.dataset.eid).style.display = "none";
                    chrome.runtime.sendMessage({mute: true, eid: clickEvent.currentTarget.dataset.eid});
                    return true; // makes this async
                });
                eventNode.appendChild(ignoreNode);
                document.getElementById("todo5_header").appendChild(eventNode);
                document.getElementById("todo5_header").style.display = "block";
                console.log("Todo5: Added event banner", event);
            }
        });
    }
});


/**
 * Cleans up reminder banners for events that are no longer in progress or are muted.
 *
 * @param {Array} events - List of in-progress events.
 * @param {Object} mutedEventsIds - Dictionary of muted event IDs.
 */
function cleanReminderBanners(events, mutedEventsIds) {
  const inProgressEventsIdDict = {};
  for (const event of events) {
    if (event.hasOwnProperty('id')) {
      inProgressEventsIdDict[event.id] = true;
    }
  }

  const elements = document.getElementsByClassName("todo5_event");
  Array.from(elements).forEach(element => {
    if (!inProgressEventsIdDict[element.dataset.eid]) {
      console.log("Removing stale reminder", element.dataset.eid);
      element.parentNode.removeChild(element);
    }
    if (mutedEventsIds[element.dataset.eid]) {
      console.log("Removing muted reminder", element.dataset.eid);
      element.parentNode.removeChild(element);
    }
  });
}
