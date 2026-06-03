const { onCall } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("../..");

exports.deleteArchive = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { key } = request.data;
  await db.ref("archives/" + key).remove();

  return { success: true };
});
