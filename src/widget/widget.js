import Threads from "../dataAccess/Threads";
import authManager from "../dataAccess/authManager";

authManager.onUserChange = initWidget;

authManager.enforceLogin();

let loggedInUser = {};

function reloadMessages(threads, clearOldThreads) {
  if (threads.length === 0) {
    showEmptyState();
  } else {
    hideEmptyState();
  }
  const inboxMessages = document.getElementById("inboxMessages");
  let thread_template = document.getElementById("thread-ui-template").innerHTML;
  if (clearOldThreads) inboxMessages.innerHTML = "";
  threads.forEach((thread) => {
    let otherUser = thread.users.find((u) => u._id !== loggedInUser._id);
    if (!otherUser) otherUser = thread.users[0];
    let imageUrl;
    if (otherUser.imageUrl)
      imageUrl = buildfire.imageLib.cropImage(otherUser.imageUrl, {
        size: "xs",
        aspect: "1:1",
      });
    else imageUrl = "./.images/avatar.png";
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

    element.innerHTML = thread_template
      .replace("{{displayName}}", otherUser.displayName)
      .replace("{{imageUrl}}", imageUrl)
      .replace("{{lastMessage}}", lastMessageText)
      .replace("{{visibility}}", redDotVisible ? "visible" : "hidden");

    element.onclick = () => {
      if (redDotVisible) Threads.setReadTrue(loggedInUser, thread, () => {});

      buildfire.navigation.navigateTo({
        pluginId: thread.navigationData.pluginId,
        instanceId: thread.navigationData.instanceId,
        folderName: thread.navigationData.folderName,
        title: thread.wallTitle,
        queryString: "wid=" + thread.wallId + "&wTitle=" + thread.wallTitle,
      });
    };

    inboxMessages.appendChild(element);
  });
}

function initWidget(user) {
  loggedInUser = user;
  Threads.getThreads(user, 0, 20, (err, threads) => {
    reloadMessages(threads, true);
  });

  let form = document.getElementById("searchForm");
  form.addEventListener("submit", onSearch);

  injectThemeStyle();
}

function onSearch(e) {
  e.preventDefault();
  let keyword = document.getElementById("searchInput").value;
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
