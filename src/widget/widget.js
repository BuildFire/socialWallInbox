import Threads from "../dataAccess/Threads";
import authManager from "../dataAccess/authManager";
import UserShared from "../dataAccess/UserShared";

authManager.onUserChange = initWidget;

authManager.enforceLogin();

let loggedInUser = {};
let currentUserPro = false;

let leads = [];
let customers = [];
let searched = null;

function reloadMessages(threads, clearOldThreads) {
  if (threads.length === 0) {
    showEmptyState();
  } else {
    hideEmptyState();
  }
  const inboxMessages = document.getElementById("inboxMessages");
  if (clearOldThreads) {
    inboxMessages.innerHTML = "";
    leads = [], customers = [];
  }

  threads.forEach((thread, index) => {
    let otherUser = thread.users.find((u) => u._id !== loggedInUser._id);
    if (!otherUser) otherUser = thread.users[0];
    searchFilters.style.display = 'flex';
    checkCustomerAndRender(otherUser, thread, index)
  });
}

function checkCustomerAndRender(otherUser, thread, index) {
  UserShared.isUserCusomer(loggedInUser.email, otherUser.email, (err, isCustomer) => {
    let chipText = null;
    if (isCustomer) {
      chipText = "Customer";
      customers.push(thread);
    } else {
      chipText = "Lead";
      leads.push(thread);
    }
    render(thread, otherUser, chipText, index);
  })
}

function render(thread, otherUser, chipText, index) {
  let thread_template = document.getElementById("thread-ui-template").innerHTML;
  let imageUrl;
  if (otherUser.imageUrl)
    imageUrl = buildfire.imageLib.cropImage(otherUser.imageUrl, {
      size: "xs",
      aspect: "1:1",
    });
  else imageUrl = "./images/avatar.png";
  let element = document.createElement("div");

  let time = new Date(thread.lastMessage.createdAt);

  if (isToday(time)) {
    time = time.toLocaleTimeString().slice(0, 5) + " - ";
  } else {
    time = time.toDateString().slice(4, 10) + " - ";
  }

  const lastMessageText = time + unescape(thread.lastMessage.text);

  const redDotVisible =
    thread.lastMessage.sender === otherUser._id && !thread.lastMessage.isRead;

  let chipIconName = chipText === 'Lead' ? 'offline_bolt' : 'check_circle';
  let chipIcon =
    currentUserPro ? `<i class="material-icons mdc-chip__icon mdc-chip__icon--leading">${chipIconName}</i>` : '';

  let chipTemplate = ` 
    <div class="mdc-chip mdc-chip_over" role="row">
    <div class="mdc-chip__ripple"></div>
    ${chipIcon}
    <span role="gridcell">
      <span role="button" tabindex="0" class="mdc-chip__primary-action">
        <span class="mdc-chip__text">${chipText}</span>
      </span>
    </span>
  </div>`;

  let userStatus = chipText ? chipTemplate : '';

  element.innerHTML = thread_template
    .replace("{{displayName}}", otherUser.displayName)
    .replace("{{userStatus}}", userStatus)
    .replace("{{imageUrl}}", imageUrl)
    .replace("{{lastMessage}}", lastMessageText)
    .replace("{{visibility}}", redDotVisible ? "visible" : "hidden");

  element.dataset.index = index;

  element.onclick = () => {
    if (redDotVisible) Threads.setReadTrue(loggedInUser, thread, () => { });

    let actionItem = {
      "type": "navigation",
      "action": "linkToApp",
      "pluginId": "f25fc64e-7abe-474a-9245-d91d2026ff5b",
      "title": "Secure File Manager",
      "iconUrl": "https://pluginserver.buildfire.com/plugins/4e97861a-2a10-4205-8d47-cdaaae690eff/resources/icon.png"
    }
    actionItem = JSON.stringify(actionItem);
    buildfire.navigation.navigateTo({
      pluginId: thread.navigationData.pluginId,
      instanceId: thread.navigationData.instanceId,
      folderName: thread.navigationData.folderName,
      title: thread.wallTitle,
      queryString: "wid=" + thread.wallId + "&wTitle=" + thread.wallTitle + "&actionItem=" + actionItem,
    });
  };
  if (typeof index === "undefined") {
    inboxMessages.appendChild(element);
  } else {
    let inserted = false;
    for (let i = 0; i < inboxMessages.children.length; i++) {
      let child = inboxMessages.children[i];
      if (child.dataset && child.dataset.index > index) {
        inboxMessages.insertBefore(element, child);
        inserted = true;
        return;
      }
    }
    if (!inserted) {
      inboxMessages.appendChild(element);
    }
  }
}

function loadFilteredMessages(threads) {
  inboxMessages.innerHTML = "";
  threads.forEach((thread) => {
    let otherUser = thread.users.find((u) => u._id !== loggedInUser._id);
    if (!otherUser) otherUser = thread.users[0];
    render(thread, otherUser, searched);
  });
}

const debounce = (fn, time) => {
  let timeout;
  return function (...args) { // <-- not an arrow function
    const functionCall = () => fn.apply(this, args);
    clearTimeout(timeout);
    timeout = setTimeout(functionCall, time);
  };
};


function initWidget(user) {
  loggedInUser = user;
  Threads.getThreads(user, 0, 20, (err, threads) => {
    reloadMessages(threads, true);
  });

  searchTxt.addEventListener('keyup', debounce(function (e) {
    onSearch(e);
  }, 300));

  buildfire.appearance.getAppTheme((err, obj) => {
    document.documentElement.style.setProperty("--barColor", obj.colors.titleBarTextAndIcons);
    document.documentElement.style.setProperty("--barBGColor", obj.colors.titleBar);
  });

  filterLead.onclick = () => {
    if (searched === 'Customer') {
      leadIcon.style.width = '20px';
      leadIcon.innerHTML = 'done';
      searched = null;
      return Threads.getThreads(loggedInUser, 0, 20, (err, threads) => {
        reloadMessages(threads, true);
      });
    } else if (searched === 'Lead') {
      customerIcon.style.width = '20px';
      customerIcon.innerHTML = 'done';
    }
    leadIcon.style.width = 'unset';
    leadIcon.innerHTML = '';
    searched = 'Customer';
    loadFilteredMessages(customers);
  }
  filterCustomer.onclick = () => {
    if (searched === 'Lead') {
      customerIcon.style.width = '20px';
      customerIcon.innerHTML = 'done';
      searched = null;
      return Threads.getThreads(loggedInUser, 0, 20, (err, threads) => {
        reloadMessages(threads, true);
      });
    }
    else if (searched === 'Customer') {
      leadIcon.style.width = '20px';
      leadIcon.innerHTML = 'done';
    }
    customerIcon.style.width = 'unset';
    customerIcon.innerHTML = '';
    searched = 'Lead';
    loadFilteredMessages(leads);
  }

  injectThemeStyle();
}

function onSearch(e) {
  e.preventDefault();
  leadIcon.style.width = '20px'; leadIcon.innerHTML = 'done';
  customerIcon.style.width = '20px'; customerIcon.innerHTML = 'done';
  searched = null;
  let keyword = document.getElementById("searchTxt").value;
  if (keyword.length === 0) return initWidget(loggedInUser);
  Threads.search(loggedInUser, keyword, 0, 20, (err, threads) => {
    reloadMessages(threads, true);
  });
}

function showEmptyState() {
  let emptyState = document.getElementById("emptyState");
  emptyState.style.visibility = "visible";
}

function hideEmptyState() {
  let emptyState = document.getElementById("emptyState");
  emptyState.style.visibility = "hidden";
}

function isToday(someDate) {
  const today = new Date();
  return (
    someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
  );
}

function injectThemeStyle() {
  buildfire.appearance.getAppTheme((err, theme) => {
    let { colors } = theme;
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
      .primaryTextTheme { color: ${colors.bodyText} !important; }
      .dangerBackgroundTheme { background-color: ${colors.dangerTheme} !important; }
      .icon { color: ${colors.icons} !important; }
      .search-input { color: ${colors.bodyText} !important; }
    `;
    document.getElementsByTagName("head")[0].appendChild(style);

  });
}
