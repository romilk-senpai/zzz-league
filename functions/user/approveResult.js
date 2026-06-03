const { onCall, HttpsError } = require("firebase-functions/https");
const { db } = require("..");

exports.approveResult = onCall({ cors: true }, async (request) => {
  const {
    tournamentId, matchId, uid, resultP1, resultP2
  } = request.data;

  if (!tournamentId || !uid) {
    throw new HttpsError("invalid-argument", "tournamentId is required");
  }

  const matchRef = db.ref(`tournaments/${tournamentId}/${matchId}`);
  let matchSnap = await matchRef.once("value");
  const match = matchSnap.val();
  if (!match) {
    throw new HttpsError("not-found", "Match not found");
  }

  const updates = [];

  if (resultP1.trim() !== match.resultP1 || resultP2.trim() !== match.resultP2) {
    updates.p1ApporvedResult = false;
    updates.p2ApporvedResult = false;
  }

  switch (uid) {
    case match.p1:
      updates["p1ApporvedResult"] = !match.p1ApporvedResult;
      break;
    case match.p2:
      updates["p2ApporvedResult"] = !match.p1ApporvedResult;
      break;
    default:
      throw new HttpsError("not-found", "Match player not found");
  }

  matchSnap = await match.once("value");

  if (matchSnap.p1ApporvedResult && matchSnap.p2ApporvedResult) {
  }

  return { success: true };
});
