const { onCall, HttpsError } = require("firebase-functions/https");
const { validateAdminRequest, db } = require("..");

exports.resetSeason = onCall({ cors: true }, async (request) => {
  await validateAdminRequest(request);

  const { seasonName } = request.data;
  if (!seasonName) {
    throw new HttpsError("invalid-argument", "seasonName is required");
  }

  const snap = await db.ref("players").once("value");
  const playersObj = snap.val();
  if (!playersObj) {
    throw new HttpsError("not-found", "No players found");
  }

  const players = Object.values(playersObj);

  const updates = {};

  updates["archives/" + seasonName] = players.map((player) => ({
    name: player.name,
    elo: player.elo || 1000,
    isMidConfirmed: player.isMidConfirmed || false,
    isHighConfirmed: player.isHighConfirmed || false,
  }));

  players.forEach((player) => {
    const start = player.isHighConfirmed ?
      1400 : player.isMidConfirmed ? 1200 : 1000;
    updates["players/" + player.uid + "/elo"] = start;
    updates["players/" + player.uid + "/tournamentPoints"] = 0;
  });

  updates["history"] = null;

  await db.ref().update(updates);

  return { success: true };
});
