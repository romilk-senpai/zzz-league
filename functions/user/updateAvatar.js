import {onCall, HttpsError} from "firebase-functions/https";
import {db} from "../config/firebase.js";
import {defaultOptions} from "../config/options.js";

export const updateAvatar = onCall(defaultOptions, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const {avatar} = request.data;
  if (!avatar || typeof avatar !== "string") {
    throw new HttpsError("invalid-argument", "avatar is required");
  }

  await db.ref(`players/${callerUid}/avatar`).set(avatar);

  return {success: true};
});
