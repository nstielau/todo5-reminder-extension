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
        for (const i in inProgressEvents) {
            if (!document.getElementById(inProgressEvents[i].id)) {
                const eventNode = document.createElement("div");
                const h1Node = document.createElement("h1");
                const textnode = document.createTextNode(inProgressEvents[i].summary);
                eventNode.classList.add('todo5_event');
                eventNode.id = inProgressEvents[i].id;
                eventNode.dataset.eid = inProgressEvents[i].id;
                eventNode.appendChild(h1Node);
                h1Node.appendChild(textnode);
                if (inProgressEvents[i].hangoutLink) {
                    const linkNode = document.createElement("a");
                    linkNode.setAttribute('target', '_blank');
                    linkNode.setAttribute('href', inProgressEvents[i].hangoutLink);
                    const linkTextnode = document.createTextNode("Join Video");
                    linkNode.appendChild(linkTextnode);
                    eventNode.appendChild(linkNode);
                }

                const closeNode = document.createElement("a");
                const closeTextnode = document.createTextNode("Close");
                closeNode.appendChild(closeTextnode);
                closeNode.dataset.eid = inProgressEvents[i].id;
                closeNode.classList.add('close');
                closeNode.addEventListener('click', function(clickEvent) {
                    console.log("Todo5: Handling click on banner");
                    document.getElementById(clickEvent.currentTarget.dataset.eid).style.display = "none";
                    chrome.runtime.sendMessage({mute: true, eid: clickEvent.currentTarget.dataset.eid});
                    return true; // makes this async
                });
                eventNode.appendChild(closeNode);
                document.getElementById("todo5_header").appendChild(eventNode);
                document.getElementById("todo5_header").style.display = "block";
                console.log("Todo5: Added event banner", inProgressEvents[i])
            }
        }
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
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!inProgressEventsIdDict[element.dataset.eid]) {
        console.log("Removing stale reminder", element.dataset.eid);
        element.parentNode.removeChild(element);
    }
  }
}
