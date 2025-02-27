import Threads from "../dataAccess/Threads";
import authManager from "../dataAccess/authManager";

authManager.onUserChange = initWidget;

authManager.enforceLogin();

let loggedInUser = {};

async function reloadMessages(threads, clearOldThreads) {
  if (threads.length === 0) {
    showEmptyState()
  }
  else {
    hideEmptyState();
  }
  
  const inboxMessages = document.getElementById("inboxMessages");
  if (clearOldThreads) inboxMessages.innerHTML = "";
  
  const userProfilesMap = await fetchUserProfiles(threads);
  const elementsToAppend = threads.map(thread => createThreadElement(thread, userProfilesMap)).filter(Boolean);
  
  appendSortedThreads(elementsToAppend, inboxMessages);
}
async function fetchUserProfiles(threads) {
  const uniqueUserIds = new Set();
  threads.forEach(thread => thread.users.forEach(user => uniqueUserIds.add(user._id)));
  
  if (uniqueUserIds.size === 0) return {};
  
  try {
    const users = await getUserProfiles([...uniqueUserIds]);
    return users.reduce((map, user) => {
      if (user) map[user._id] = user;
      return map;
    }, {});
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return {};
  }
}

function createThreadElement(thread, userProfilesMap) {
  thread.users.forEach(user => user.userDetails = userProfilesMap[user._id] || user);
  
  const { otherUser, otherUsers } = getThreadParticipants(thread, userProfilesMap);
  if (!otherUser && !otherUsers) return null;
  
  const { imageUrl, displayName } = getThreadDisplayData(thread, otherUser, otherUsers);
  const lastMessageText = formatLastMessage(thread.lastMessage);
  const redDotVisible = shouldShowUnreadIndicator(thread.lastMessage);
  
  return {
    time: thread.lastMessage.createdAt,
    obj: createThreadHTML(thread, displayName, imageUrl, lastMessageText, redDotVisible, otherUsers),
  };
}
function getThreadParticipants(thread, userProfilesMap) {
  if (thread.isSupportThread) {
    return {
      otherUsers: thread.users.map(u => userProfilesMap[u._id]).filter(Boolean),
    };
  }
  
  const recipient = thread.users.find(u => u._id !== loggedInUser._id);
  return {
    otherUser: recipient ? userProfilesMap[recipient._id] || null : null,
  };
}

function getThreadDisplayData(thread, otherUser, otherUsers) {
  if (thread.isSupportThread && otherUsers.length) {
    return {
      imageUrl: "./images/people_alt.svg",
      displayName: otherUsers
              .map((user) => {
                return user.displayName
                ? user.displayName
                : user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName
                ? user.firstName
                : user.lastName
                ? user.lastName
                : "Someone";
              })
              .join(", ")
  );
    };
  }
  
  return {
    imageUrl: (otherUser && otherUser.imageUrl)
            ? buildfire.imageLib.cropImage(otherUser.imageUrl, { size: "xs", aspect: "1:1" })
            : "./images/avatar.png",
    displayName: otherUser.displayName
            ? otherUser.displayName : otherUser.firstName && otherUser.lastName ?
            `${otherUser.firstName} ${otherUser.lastName}` : otherUser.firstName ?
             otherUser.firstName : otherUser.lastName ?
             otherUser.lastName : "Someone",
    
  };
}

function formatLastMessage(lastMessage) {
  const time = new Date(lastMessage.createdAt);
  const formattedTime = isToday(time) ? time.toLocaleTimeString().slice(0, 5) + " - " : time.toDateString().slice(4, 10) + " - ";
  return formattedTime + unescape(lastMessage.text);
}

function shouldShowUnreadIndicator(lastMessage) {
  return lastMessage.sender !== loggedInUser._id && lastMessage && !lastMessage.isRead;
}

function createThreadHTML(thread, displayName, imageUrl, lastMessageText, redDotVisible, otherUsers) {
  let template = document.getElementById("thread-ui-template").innerHTML;
  template = template
          .replace("{{displayName}}", displayName)
          .replace("{{imageUrl}}", imageUrl)
          .replace("{{lastMessage}}", lastMessageText)
          .replace("{{visibility}}", redDotVisible ? "visible" : "hidden");
  
  const element = document.createElement("div");
  element.innerHTML = template;
  element.onclick = () => handleThreadClick(thread, redDotVisible, otherUsers);
  
  return element;
}

function handleThreadClick(thread, redDotVisible, otherUsers) {
  
  const wallTitle = prepareCommunityWallTitleBar(thread.users) || thread.wallTitle;
  if (redDotVisible) Threads.setReadTrue(loggedInUser, thread, () => {});
  
  let navigationParams = {
    pluginId: thread.navigationData.pluginId,
    instanceId: thread.navigationData.instanceId,
    folderName: thread.navigationData.folderName,
    queryString: `wid=${thread.wallId}`,
    title: wallTitle,
  };
  
  if (otherUsers && otherUsers.length) {
    navigationParams.queryString += `&userIds=${otherUsers.map(u => u._id).join(",")}`;
  }
  
  buildfire.navigation.navigateTo(navigationParams);
}

function appendSortedThreads(elements, inboxMessages) {
  elements.sort((a, b) => new Date(b.time) - new Date(a.time));
  elements.forEach(({ obj }) => inboxMessages.appendChild(obj));
}

async function getUserProfiles(userIds) {
  return new Promise((resolve, reject) => {
    buildfire.auth.getUserProfiles({ userIds }, (err, users) => {
      if (err) return reject(err);
      resolve(users);
    });
  });
}

function prepareCommunityWallTitleBar(usersDetails) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  function getUserName(userDetails) {
    let name = null;
    if (userDetails && userDetails.displayName !== 'Someone' && !re.test(String(userDetails.displayName).toLowerCase()) &&
      userDetails.displayName) {
      name = userDetails.displayName;
    } else if (userDetails && userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
      userDetails.firstName && userDetails.lastName) {
      name = userDetails.firstName + ' ' + userDetails.lastName;
    } else if (userDetails && userDetails.firstName !== 'Someone' && !re.test(String(userDetails.firstName).toLowerCase()) &&
      userDetails.firstName) {
      name = userDetails.firstName;
    } else if (userDetails && userDetails.lastName !== 'Someone' && !re.test(String(userDetails.lastName).toLowerCase()) &&
      userDetails.lastName) {
      name = userDetails.lastName;
    } else {
      name = 'Someone';
    }
    if (name.length > 25) {
      name = name.substring(0, 25) + '...';
    }
    return name;
  }

  const userNames = usersDetails.map(user => getUserName(user.userDetails));
  return userNames.join(' | ');
}

function initWidget(user) {
  loggedInUser = user;
  Threads.getThreads(user, 0, 20, async (err, threads) => {
    await reloadMessages(threads, true);
  });

  let form = document.getElementById("searchForm");
  form.addEventListener("submit", onSearch);
  let getMoreThreads = true;
  let loading = false;
  let inboxMessages = document.getElementById("inboxMessages");
  inboxMessages.onscroll = () =>{
    if(getMoreThreads && !loading){
      if (inboxMessages.scrollHeight - inboxMessages.scrollTop - inboxMessages.clientHeight < 1){
        loading = true;
        toggleLoading();
        Threads.getThreads(user, document.getElementById("inboxMessages").childNodes.length, 20, async(err, threads) => {
          if(threads.length < 20) getMoreThreads = false;
          await reloadMessages(threads, false);
          toggleLoading();
          loading = false;
        });
      }
    }
  }
  injectThemeStyle();
}

function onSearch(e) {
  e.preventDefault();
  let keyword = document.getElementById("searchInput").value;
  if (keyword.length === 0) return initWidget(loggedInUser);
  Threads.search(loggedInUser, keyword, 0, 20, async (err, threads) => {
    await reloadMessages(threads, true);
  });
}

function toggleLoading() {
    let loading = document.getElementById("loading");
     loading.style.display = loading.style.display === "flex" ? "none" : "flex";
}

function showEmptyState() {
  let emptyState = document.getElementById("emptyState");
  emptyState.style.display = "flex";
}

function hideEmptyState() {
  let emptyState = document.getElementById("emptyState");
  emptyState.style.display = "none";
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

let goBack = buildfire.navigation.onBackButtonClick;
buildfire.navigation.onBackButtonClick = function() {
   goBack();
}
