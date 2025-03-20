import Thread from "../data/Thread";

class Threads {
  /**
   * Get Database Tag
   */
  static get TAG() {
    return "thread";
  }

  static get WALL_ID_LENGTH() {
    return 48;
  }

  /**
   * Verify that wall id is 2 user ids concatinated, return users array if successfull
   * @param {Object} user Logged in user
   * @param {String} wallId 48 Character wall id, both halves should be valis builfire user ids
   * @param {Function} callback Callback function
   */
  static verifyWallId(user, wallId, callback) {
    let wallIdLength = Threads.WALL_ID_LENGTH;
    let userIdLength = wallIdLength / 2;

    if (!wallId || wallId.length != wallIdLength)
      return callback(new Error("Invalid wall id"));

    const user1Id = wallId.slice(0, userIdLength);
    const user2Id = wallId.slice(userIdLength, wallIdLength);

    if (user._id !== user1Id && user._id !== user2Id)
      return callback(
        new Error("Logged in user must be one of the wall users")
      );

    let users = [];

    const resolve = user => {
      users.push(user);
      if (users.length === 2) callback(null, users);
    };

    buildfire.auth.getUserProfile({ userId: user1Id }, (err, user) => {
      if (err) return callback(err);
      if (!user) return callback(new Error("User not found"));
      resolve(user);
    });

    buildfire.auth.getUserProfile({ userId: user2Id }, (err, user) => {
      if (err) return callback(err);
      if (!user) return callback(new Error("User not found"));
      resolve(user);
    });
  }

  /**
   * Search for an existing thread using wall id, create new one if thread does not exist
   * This function will always return valid thread
   * @param {Object} user Logged in user
   * @param {String} wallId 48 character wall id
   * @param {String} wallTitle Wall title, usually display names concatinated
   * @param {Function} callback Callback function
   */
  static getThread(user, wallId, wallTitle, callback) {
    Threads.verifyWallId(user, wallId, (err, users) => {
      if (err) return callback(err);

      const filters = {
        filter: {
          "_buildfire.index.number1": 1,
          "_buildfire.index.string1": wallId
        }
      };

      buildfire.appData.search(filters, Threads.TAG, (err, records) => {
        if (err) return callback(err);

        const createdBy = user._id;

        if (!records || !records.length) {
          let thread = new Thread({
            data: { users, wallId, wallTitle, createdBy }
          });

          buildfire.appData.insert(
            thread.toJSON(),
            Threads.TAG,
            false,
            (err, record) => {
              if (err) return callback(err);
              return callback(null, new Thread(record));
            }
          );
        } else {
          return callback(null, new Thread(records[0]));
        }
      });
    });
  }

  /**
   * Will be triggered on PSW2 when user sends a new message
   * This function will get the existing thread and update it with new message
   * @param {Object} user Logged in user
   * @param {String} message Message to be sent
   * @param {Function} callback Callback function
   */
  static onSendMessage(user, message, callback) {
    // GET wallId and wallTitle from query params in PSW2
    const wallId = "5d6555b3779a7605212d7e8e5d6555b3779a7605212d7e8e";
    const wallTitle = "Faruk Alibasic | Faruk Alibasic";

    Threads.getThread(user, wallId, wallTitle, (err, thread) => {
      if (err) return;

      thread.lastUpdatedOn = new Date();
      thread.lastUpdatedBy = user._id;
      thread.lastMessage = {
        text: message,
        createdAt: new Date(),
        sender: user._id,
        isRead: false
      };

      buildfire.appData.update(
        thread.id,
        thread.toJSON(),
        Threads.TAG,
        (err, record) => {
          if (err) return callback(err);
          return callback(null, new Thread(record));
        }
      );
    });
  }

  /**
   * Get all threads where logged in user is one of the users
   * Used for fetching inbox
   * @param {Object} user Logged in user
   * @param {NUmber} skip Pagination skip
   * @param {Number} limit Pagination limit
   * @param {Function} callback Callback function
   */
  static getThreads(user, skip, limit, callback) {
    if (!skip) skip = 0;
    if (!limit) limit = 25;

    const searchOptions = {
      filter: {
        "_buildfire.index.number1": 1,
        "_buildfire.index.array1.string1": user._id
      },
      sort: { "_buildfire.index.date1": -1 },
      skip,
      limit
    };
    buildfire.appData.search(searchOptions, Threads.TAG, (err, records) => {
      if (err) return callback(err);
      return callback(
        null,
        records.map(record => new Thread(record))
      );
    });
  }

  /**
   * Searches threads to find user using keyword
   * @param {Object} user Logged in user
   * @param {String} keyword Search keyword
   * @param {Number} skip Pagination skip
   * @param {Number} limit Pagination limit
   * @param {Function} callback Callback function
   */
  static search(user, keyword, skip, limit, callback) {
    if (!skip) skip = 0;
    if (!limit) limit = 25;

    const searchOptions = {
      filter: {
        "_buildfire.index.number1": 1,
        "_buildfire.index.array1.string1": user._id,
        "_buildfire.index.text": { $regex: keyword, $options: 'i' }
      },
      sort: { "_buildfire.index.date1": -1 },
      skip,
      limit
    };
    buildfire.appData.search(searchOptions, Threads.TAG, (err, records) => {
      if (err) return callback(err);
      return callback(
        null,
        records.map(record => new Thread(record))
      );
    });
  }

  static setReadTrue(user, thread, callback) {
    if (!(thread instanceof Thread))
      return callback(new Error("Only Thread instance can be used"));

    thread.lastUpdatedBy = user._id;
    thread.lastUpdatedOn = new Date();
    thread.lastMessage.isRead = true;

    buildfire.appData.update(
      thread.id,
      thread.toJSON(),
      Threads.TAG,
      (err, record) => {
        if (err) return callback(err);
        return callback(null, new Thread(record));
      }
    );
  }


  /**
   * Soft delete single thread instance
   * @param {Object} user Logged in user
   * @param {Thread} thread Instance of thread data class
   * @param {Function} callback Callback function
   */
  static del(user, thread, callback) {
    if (!(thread instanceof Thread))
      return callback(new Error("Only Thread instance can be used"));

    thread.deletedBy = user._id;
    thread.deletedOn = new Date();
    thread.isActive = false;

    buildfire.appData.update(
      thread.id,
      thread.toJSON(),
      Threads.TAG,
      (err, record) => {
        if (err) return callback(err);
        return callback(null, new Thread(record));
      }
    );
  }

  static deleteThread(threadId, callback) {
    buildfire.appData.delete(threadId, Threads.TAG, callback);
  }
}

export default Threads;
