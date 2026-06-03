const { onCall } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("..");

exports.setTimer = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { timer } = request.data;
  await db.ref("timer").set(timer);
  return { success: true };
});
