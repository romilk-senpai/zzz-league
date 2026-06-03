const { onCall } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("../..");

exports.addHistoryEntry = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { playerName1, playerName2, change } = request.data;

  await db.ref("history").push({
    p1: playerName1,
    p2: playerName2,
    change,
    timestamp: Date.now(),
  });

  return { success: true };
});
