const { onCall, HttpsError } = require("firebase-functions/https");
const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_NEWBIE_ROLE, DISCORD_MID_ROLE, DISCORD_HIGH_ROLE, validateAdminRequest, db, assignDiscordRole } = require("..");

exports.updatePlayerElo = onCall({
  cors: true,
  secrets: [DISCORD_BOT_TOKEN, DISCORD_GUILD_ID,
    DISCORD_NEWBIE_ROLE, DISCORD_MID_ROLE, DISCORD_HIGH_ROLE],
}, async (request) => {
  await validateAdminRequest(request);

  const { uid, elo } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  const snapshot = await db.ref("players/" + uid).once("value");

  if (!snapshot.exists()) {
    throw new HttpsError("not-found", "Player not found");
  }

  const oldElo = snapshot.val().elo;

  await db.ref("players/" + uid).update({
    elo,
    isMidConfirmed: elo >= 1200,
    isHighConfirmed: elo >= 1400,
  });

  await db.ref("historyV2/" + uid).push({
    change: elo - oldElo,
    timestamp: Date.now(),
  });

  assignDiscordRole(uid);

  return { success: true };
});
