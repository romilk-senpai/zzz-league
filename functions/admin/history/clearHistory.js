const { onCall } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("../..");

exports.clearHistory = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);
  await db.ref("history").remove();

  return { success: true };
});
