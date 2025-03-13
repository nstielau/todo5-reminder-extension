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
                const eventNode = document.createElement("article");
                eventNode.classList.add('card', 'todo5_event');
                eventNode.id = event.id;
                eventNode.dataset.eid = event.id;

                const headerNode = document.createElement("header");
                headerNode.classList.add('flex', 'five');

                const titleDiv = document.createElement("div");
                titleDiv.classList.add('four-fifth');
                const h1Node = document.createElement("h1");
                h1Node.innerHTML = event.summary.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
                    return `<a href="${url}" target="_blank">${url}</a>`;
                });
                titleDiv.appendChild(h1Node);
                headerNode.appendChild(titleDiv);

                const buttonDiv = document.createElement("div");
                buttonDiv.classList.add('fifth');

                if (event.hangoutLink) {
                    const linkButton = document.createElement("button");
                    linkButton.textContent = "Join Video";
                    linkButton.addEventListener('click', () => {
                        window.open(event.hangoutLink, '_blank');
                    });
                    linkButton.classList.add('right');
                    buttonDiv.appendChild(linkButton);
                }

                const ignoreButton = document.createElement("button");
                ignoreButton.textContent = chrome.i18n.getMessage("ignoreText");
                ignoreButton.dataset.eid = event.id;
                ignoreButton.classList.add('ignore');
                ignoreButton.addEventListener('click', (clickEvent) => {
                    console.log("Todo5: Handling click on banner");
                    document.getElementById(clickEvent.currentTarget.dataset.eid).style.display = "none";
                    chrome.runtime.sendMessage({mute: true, eid: clickEvent.currentTarget.dataset.eid});
                    return true; // makes this async
                });
                ignoreButton.classList.add('right');
                buttonDiv.appendChild(ignoreButton);

                if (!event.attendees || event.attendees.length === 1) {
                    const focusButton = document.createElement("button");
                    focusButton.textContent = "Focus";
                    focusButton.dataset.eid = event.id;
                    focusButton.classList.add('focus');
                    focusButton.addEventListener('click', (clickEvent) => {
                        console.log("Todo5: Focus mode activated");
                        const eventElement = document.getElementById(clickEvent.currentTarget.dataset.eid);
                        eventElement.querySelector('.ignore').style.display = "none";
                    });
                    focusButton.classList.add('right');
                    buttonDiv.appendChild(focusButton);
                }

                headerNode.appendChild(buttonDiv);

                eventNode.appendChild(headerNode);

                if (event.description) {
                    const footerNode = document.createElement("footer");
                    const descriptionNode = document.createElement("pre");
                    descriptionNode.innerHTML = event.description.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
                        return event.description.includes(`<a href="${url}`) ? url : `<a href="${url}" target="_blank">${url}</a>`;
                    });
                    footerNode.appendChild(descriptionNode);
                    eventNode.appendChild(footerNode);
                }

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
