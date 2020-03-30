import buildfire from "buildfire";
import { logInfo } from "./helpers";

import InboxTest from "./screens/inbox.test";

export default function runTests() {
  buildfire.auth.getCurrentUser((err, result) => {
    if (err) return err;
    if (result == null) {
      buildfire.auth.login({ allowCancel: false }, (err, result) => {
        if (err) return console.error(err);
        logInfo("Running Control Panel tests");
        executeTests(result);
      });
    } else {
      logInfo("Running Control Panel tests");

      executeTests(result);
    }
  });
}

function executeTests(user) {
  InboxTest.run(user);
}
