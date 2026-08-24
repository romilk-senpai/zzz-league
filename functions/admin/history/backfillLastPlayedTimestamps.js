import {onCall} from "firebase-functions/https";
import {validateAdminRequest} from "../../utils/validateAdminRequest.js";
import {db} from "../../config/firebase.js";
import {defaultOptions} from "../../config/options.js";

export const backfillLastPlayedTimestamps =
  onCall(defaultOptions, async (request) => {
    await validateAdminRequest(request);

    const [historySnap, playersSnap] = await Promise.all([
      db.ref("historyV3").once("value"),
      db.ref("players").once("value"),
    ]);

    const history = historySnap.val() || {};
    const players = playersSnap.val() || {};

    const lastPlayed = {};
    for (const entry of Object.values(history)) {
      const {p1, p2, timestamp} = entry;
      if (p1 && (!lastPlayed[p1] || timestamp > lastPlayed[p1])) {
        lastPlayed[p1] = timestamp;
      }
      if (p2 && (!lastPlayed[p2] || timestamp > lastPlayed[p2])) {
        lastPlayed[p2] = timestamp;
      }
    }

    const updates = {};
    for (const [uid, timestamp] of Object.entries(lastPlayed)) {
      if (!players[uid]) continue;
      const current = players[uid].lastPlayedTournamentTimestamp || 0;
      if (timestamp > current) {
        updates[`players/${uid}/lastPlayedTournamentTimestamp`] = timestamp;
      }
    }

    await db.ref().update(updates);

    return {success: true, updatedPlayers: Object.keys(updates).length};
  });
