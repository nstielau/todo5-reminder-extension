const readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        console.log("Todo5: Calendar extension registered on this page");
        const todo5_header = document.createElement("div");
        todo5_header.id = "todo5_header";
        todo5_header.addEventListener("dblclick", todo5_header_click);
        document.body.prepend(todo5_header);
    }
}, 100);

function todo5_header_click(event) {

    const header = document.getElementById('todo5_header');
    console.log("header", header, header.style.width);
    if (header.style.bottom == "0px") {
        header.style.bottom = "auto";
    } else {
        header.style.bottom = "0px";
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Todo5: Received message from background script', message)

    const header = document.getElementById("todo5_header");
    if (!header) {
        return
    }

    const inProgressEvents = message['inProgressEvents'];

    removeOldReminders(inProgressEvents);

    if (inProgressEvents && inProgressEvents.length > 0) {
        inProgressEvents.forEach(event => {
            if (!document.getElementById(event.id)) {
                const eventNode = document.createElement("div");
                const h1Node = document.createElement("h1");
                h1Node.textContent = event.summary;
                eventNode.classList.add('todo5_event');
                eventNode.id = event.id;
                eventNode.dataset.eid = event.id;
                eventNode.appendChild(h1Node);
                if (event?.hangoutLink) {
                    const linkNode = document.createElement("a");
                    linkNode.setAttribute('target', '_blank');
                    linkNode.setAttribute('href', event.hangoutLink);
                    linkNode.textContent = "Join Video";
                    eventNode.appendChild(linkNode);
                }

                const closeNode = document.createElement("a");
                closeNode.textContent = "Close";
                closeNode.dataset.eid = event.id;
                closeNode.classList.add('close');
                closeNode.addEventListener('click', (clickEvent) => {
                    console.log("Todo5: Handling click on banner");
                    document.getElementById(clickEvent.currentTarget.dataset.eid).style.display = "none";
                    chrome.runtime.sendMessage({mute: true, eid: clickEvent.currentTarget.dataset.eid});
                    return true; // makes this async
                });
                eventNode.appendChild(closeNode);
                document.getElementById("todo5_header").appendChild(eventNode);
                document.getElementById("todo5_header").style.display = "block";
                console.log("Todo5: Added event banner", event)
            }
        });
    }
});


function removeOldReminders(events) {
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
  });
}
