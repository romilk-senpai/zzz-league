const { onCall, HttpsError } = require("firebase-functions/https");
const { validateAdminRequest, db, auth } = require("..");

exports.deletePlayer = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  const snapshot = await db.ref("players/" + uid).once("value");

  if (!snapshot.exists()) {
    throw new HttpsError("not-found", "Player not found");
  }

  const username = snapshot.val().name;

  await db.ref().update({
    ["players/" + uid]: null,
    ["usernames/" + username]: null,
  });

  await auth.deleteUser(uid);

  return { success: true };
});
