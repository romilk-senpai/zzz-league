/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const admin = require("firebase-admin");

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, HttpsError} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.register = onRequest(async (request, response) => {
  const {username, email, password, discord} = request.body;

  logger.info(request.body);

  if (!username || !email || !password || !discord) {
    throw new HttpsError(
        "invalid-argument",
        "Missing fields",
    );
  }

  const db = admin.database();

  const usernameRef = db.ref("usernames/" + username);
  const usernameSnap = await usernameRef.once("value");

  if (usernameSnap.exists()) {
    throw new HttpsError(
        "already-exists",
        "Username already taken",
    );
  }

  let userRecord = [];
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const uid = userRecord.uid;

    const prevPlayerRef = db.ref("players/" + username);
    const prevSnapshot = await prevPlayerRef.once("value");

    let playerData = [];

    if (prevSnapshot.exists()) {
      const prevUserData = prevSnapshot.val();
      playerData = {
        uid,
        name: username,
        elo: prevUserData.elo ?? 1000,
        tournamentPoints: prevUserData.tournamentPoints ?? 0,
        promoStreak: prevUserData.promoStreak ?? 0,
        isMidConfirmed: prevUserData.isMidConfirmed ?? false,
        isHighConfirmed: prevUserData.isHighConfirmed ?? false,
        discord,
      };
    } else {
      playerData = {
        uid,
        name: username,
        elo: 1000,
        tournamentPoints: 0,
        promoStreak: 0,
        isMidConfirmed: false,
        isHighConfirmed: false,
        discord,
      };
    }

    const updates = {};
    updates["players/" + uid] = playerData;
    updates["usernames/" + username] = true;

    await db.ref().update(updates);

    const token = await admin.auth().createCustomToken(uid);

    return {
      token,
    };
  } catch (error) {
    logger.error(error);

    if (userRecord) {
      await admin.auth().deleteUser(userRecord.uid);
    }

    throw new HttpsError(
        "internal",
        error.message,
    );
  }
});
