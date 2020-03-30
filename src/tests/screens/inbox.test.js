import authManager from "../../dataAccess/authManager";
import Thread from "../../data/Thread";
import Threads from "../../dataAccess/Threads";

import { logInfo, logError, test, expect, cleanDataStore } from "../helpers";

export default class InboxTest {
  static run(user) {
    logInfo("Running Inbox Tests.");

    const wallId = user._id + user._id;
    const wallTitle = "wall title";
    const wrongWallId = "5d6555b3779a75d6555b3779a7605212d7e8e605212d7e8e";

    test("Verify Wall Id", () => {
      Threads.verifyWallId(user, wallId, (err, users) => {
        expect("Wall id correct and users retreived", users.length === 2);
      });
    });

    test("Verify Wall Id", () => {
      Threads.verifyWallId(user, wrongWallId, (err, users) => {
        expect("Wall id incorrect and error received", err && !users);
      });
    });

    test("Get Thread", () => {
      Threads.getThread(user, wallId, wallTitle, (err, thread) => {
        expect("Thread received", thread);
      });
    });

    test("On send message", () => {
      Threads.onSendMessage(user, "Hello there", (err, thread) => {
        expect("Thread updated", thread.lastMessage.text === "Hello there");
      });
    });

    test("Get inbox threads", () => {
      Threads.getThreads(user, 0, 1, (err, threads) => {
        expect("Threads received", threads);
      });
    });

    test("Search threads", () => {
      Threads.search(user, "faruk", 0, 1, (err, threads) => {
        expect("Searched threads received", threads);
      });
    });
  }
}
