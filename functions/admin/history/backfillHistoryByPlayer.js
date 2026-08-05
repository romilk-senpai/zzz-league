import {onCall} from "firebase-functions/https";
import {validateAdminRequest} from "../../utils/validateAdminRequest.js";
import {db} from "../../config/firebase.js";
import {defaultOptions} from "../../config/options.js";

const CHUNK_SIZE = 500;

export const backfillHistoryByPlayer =
  onCall(defaultOptions, async (request) => {
    await validateAdminRequest(request);

    const snapshot = await db.ref("historyV3").once("value");

    const updates = {};
    snapshot.forEach((child) => {
      const entry = child.val();
      const key = child.key;
      updates[`historyByPlayer/${entry.p1}/${key}`] = entry;
      if (entry.p2) {
        updates[`historyByPlayer/${entry.p2}/${key}`] = entry;
      }
    });

    const paths = Object.keys(updates);
    for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
      const chunk = {};
      for (const path of paths.slice(i, i + CHUNK_SIZE)) {
        chunk[path] = updates[path];
      }
      await db.ref().update(chunk);
    }

    return {success: true, count: paths.length};
  });
