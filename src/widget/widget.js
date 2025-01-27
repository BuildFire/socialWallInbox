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
  if (clearOldThreads) inboxMessages.innerHTML = "";
  let elementsToAppend = [];
  threads.forEach((thread) => {
    let thread_template = document.getElementById("thread-ui-template").innerHTML;
    let userIds;

    if (!thread.isSupportThread) {
      userIds = thread.users.filter(u => u._id !== loggedInUser._id).map(u => u._id);
    } else {
      userIds = thread.users.map(u => u._id);
    }

    buildfire.auth.getUserProfiles({ userIds }, (err, users)=> {
      if(err || !users.length) return console.error('User not found.');

      let otherUser, otherUsers;

      if (thread.isSupportThread) {
        otherUsers = users;
      } else {
        otherUser = users[0];
      }

      let imageUrl;
      if (otherUser && otherUser.imageUrl) {
        imageUrl = buildfire.imageLib.cropImage(otherUser.imageUrl, {
          size: "xs",
          aspect: "1:1",
        });
      }
      else if (otherUsers) {
        imageUrl = "./images/people_alt.svg";
      }
      else {
        imageUrl = "./images/avatar.png";
      }

      let element = document.createElement("div");
      let time = new Date(thread.lastMessage.createdAt);

      if (isToday(time)) {
        time = time.toLocaleTimeString().slice(0, 5) + " - ";
      } else {
        time = time.toDateString().slice(4, 10) + " - ";
      }

      const lastMessageText = time + unescape(thread.lastMessage.text);

      const redDotVisible = thread.lastMessage.sender !== loggedInUser._id && !thread.lastMessage.isRead;

        if (otherUsers) {
          thread_template = thread_template.replace(
            "{{displayName}}",
            otherUsers
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
        } else {
          thread_template = thread_template.replace("{{displayName}}", otherUser.displayName ? otherUser.displayName : otherUser.firstName && otherUser.lastName ? `${otherUser.firstName} ${otherUser.lastName}` : otherUser.firstName ? otherUser.firstName : otherUser.lastName ? otherUser.lastName : "Someone")
        }

        element.innerHTML = thread_template
        .replace("{{imageUrl}}", imageUrl)
        .replace("{{lastMessage}}", lastMessageText)
        .replace("{{visibility}}", redDotVisible ? "visible" : "hidden");

      element.onclick = () => {
        if (redDotVisible) Threads.setReadTrue(loggedInUser, thread, () => {});
        const wallTitle = thread.wallTitle || prepareCommunityWallTitleBar(thread.users);

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

      // i'm not sure why this condition has been written!! i commented it out cuz it makes issues when we are getting null for deleted users from getUserProfile(), so the threads will be larger than the elementsToAppend.

      // if(elementsToAppend.length==threads.length){
      elementsToAppend = elementsToAppend.sort((a, b) => { return new Date(b.time) - new Date(a.time); });
      elementsToAppend.forEach(toDiv => {
        inboxMessages.appendChild(toDiv.obj);
      });

      if (otherUsers) {
        element.querySelector('img.profile-image').style.backgroundColor = '#9696961A';
      }
      // }
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

  const userNames = usersDetails.map(user => getUserName(user));
  return userNames.join(' | ');
}

function initWidget(user) {
  loggedInUser = user;
  Threads.getThreads(user, 0, 20, (err, threads) => {
    reloadMessages(threads, true);
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
        Threads.getThreads(user, document.getElementById("inboxMessages").childNodes.length, 20, (err, threads) => {
          if(threads.length < 20) getMoreThreads = false;
          reloadMessages(threads, false);
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

let goBack = buildfire.navigation.onBackButtonClick;
buildfire.navigation.onBackButtonClick = function() {
   goBack();
}
