const { onCall, HttpsError } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("../..");

exports.approveRegistration = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const {
    tournamentId, uid, approved,
  } = request.data;

  if (!tournamentId || !uid || approved == null) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  await db.ref(`tournamentRegistrations/${tournamentId}/${uid}`).update({
    approved: approved,
  });
});
