const { onCall } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("../..");

exports.deleteHistoryEntry = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { key } = request.data;
  await db.ref("history/" + key).remove();

  return { success: true };
});
