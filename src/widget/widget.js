import Threads from "../dataAccess/Threads";
import authManager from "../dataAccess/authManager";

authManager.onUserChange = initWidget;

authManager.enforceLogin();

let loggedInUser = {};

async function reloadMessages(threads, clearOldThreads) {
  if (threads.length === 0) {
    showEmptyState();
  } else {
    hideEmptyState();
  }
  const inboxMessages = document.getElementById("inboxMessages");
  if (clearOldThreads) inboxMessages.innerHTML = "";
  let elementsToAppend = [];
  let allUserIds = new Set();
  
  threads.forEach(thread => {
    let userIds = thread.isSupportThread
            ? thread.users.map(u => u._id)
            : thread.users.map(u => u._id)
    
    userIds.forEach(id => allUserIds.add(id));
  });
  
  const userIdsArray = [...allUserIds];
  
  let userMap = {};
  if (userIdsArray.length > 0) {
    try {
      const users = await getUserProfiles(userIdsArray);
      userMap = users.reduce((map, user) => {
        if (user) map[user._id] = user;
        return map;
      }, {});
    } catch (error) {
      console.error("Error fetching user profiles:", error);
    }
  }
  
  threads.forEach(thread => {
    thread.users.forEach(user => {
      if (userMap[user._id]) {
        user.userDetails = userMap[user._id]; // Assigning userDetails directly
      }
    });
  });
  
  threads.forEach(thread => {
    let otherUser = null;
    let otherUsers = null;
    
    if (thread.isSupportThread) {
      otherUsers = thread.users.map(u => userMap[u._id]).filter(Boolean);
    } else {
      // One-on-one chat: Get the single other user
      let filteredUsers = thread.users.filter(u => u._id !== loggedInUser._id);
      if (filteredUsers.length > 0) {
        otherUser = userMap[filteredUsers[0]._id] || null;
      }
    }
    if (!otherUser && !otherUsers) {
      return;
    }
    
    let imageUrl;
    let displayName;
    
    if (thread.isSupportThread && otherUsers.length) {
      imageUrl = "./images/people_alt.svg";
      displayName = otherUsers
              .map(user => user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Someone")
              .join(", ");
    } else if (otherUser) {
      imageUrl = otherUser.imageUrl
              ? buildfire.imageLib.cropImage(otherUser.imageUrl, { size: "xs", aspect: "1:1" })
              : "./images/avatar.png";
      
      displayName = otherUsers
              .map((u) => {
                return u.displayName
                ? u.displayName
                : u.firstName && u.lastName
                ? `${u.firstName} ${u.lastName}`
                : u.firstName
                ? u.firstName
                : u.lastName
                ? u.lastName
                : "Someone";
              })
              .join(", ")
    );
    }
    
      let thread_template = document.getElementById("thread-ui-template").innerHTML;
      let element = document.createElement("div");
      let time = new Date(thread.lastMessage.createdAt);

      if (isToday(time)) {
        time = time.toLocaleTimeString().slice(0, 5) + " - ";
      } else {
        time = time.toDateString().slice(4, 10) + " - ";
      }

      const lastMessageText = time + unescape(thread.lastMessage.text);

      const redDotVisible = thread.lastMessage.sender !== loggedInUser._id && !thread.lastMessage.isRead;

      thread_template = thread_template
        .replace("{{displayName}}", displayName)
        .replace("{{imageUrl}}", imageUrl)
        .replace("{{lastMessage}}", lastMessageText)
        .replace("{{visibility}}", redDotVisible ? "visible" : "hidden");
      element.innerHTML = thread_template;

      element.onclick = () => {
        if (redDotVisible) Threads.setReadTrue(loggedInUser, thread, () => {});
        const wallTitle = prepareCommunityWallTitleBar(thread.users);

        let navigationParams = {
          pluginId: thread.navigationData.pluginId,
          instanceId: thread.navigationData.instanceId,
          folderName: thread.navigationData.folderName,
          title: wallTitle,
          queryString: "wid=" + thread.wallId + "&wTitle=" + wallTitle
        }

        if (otherUsers) {
          navigationParams.queryString += `&userIds=${ otherUsers.map(u => u._id) }`;
        }

        buildfire.navigation.navigateTo(navigationParams);
      };

    elementsToAppend.push({time:thread.lastMessage.createdAt,obj:element});
  });
  // i'm not sure why this condition has been written!! i commented it out cuz it makes issues when we are getting null for deleted users from getUserProfile(), so the threads will be larger than the elementsToAppend.
  
  // if(elementsToAppend.length==threads.length){
      elementsToAppend = elementsToAppend.sort((a, b) => { return new Date(b.time) - new Date(a.time); });
      elementsToAppend.forEach(toDiv => {
        inboxMessages.appendChild(toDiv.obj);
      });
}

// Fetches user profiles using Promises
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
