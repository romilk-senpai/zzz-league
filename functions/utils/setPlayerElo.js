import {HttpsError} from "firebase-functions/https";
import {db} from "../config/firebase.js";
import {assignDiscordRole} from "../discord/assignDiscordRole.js";
import {computeTierConfirmation} from "./tierConfirmation.js";

export async function setPlayerElo(uid, elo) {
  const playerSnap = await db.ref("players/" + uid).once("value");
  if (!playerSnap.exists()) {
    throw new HttpsError("not-found", "Player not found");
  }

  const player = playerSnap.val();
  const oldElo = player.elo;
  const change = elo - oldElo;

  const {isMidConfirmed, isHighConfirmed} =
    computeTierConfirmation(player, elo);

  const historyKey = db.ref("historyV3").push().key;

  const historyEntry = {
    id: historyKey,
    p1: uid,
    p1Change: change,
    p2: null,
    p2Change: null,
    tournamentId: null,
    tournamentMatch: "adjustment",
    resultP1: null,
    resultP2: null,
    resultScreenshot: null,
    timestamp: Date.now(),
  };

  const updates = {
    [`players/${uid}/elo`]: elo,
    [`players/${uid}/isMidConfirmed`]: isMidConfirmed,
    [`players/${uid}/isHighConfirmed`]: isHighConfirmed,
    [`historyV3/${historyKey}`]: historyEntry,
    [`historyByPlayer/${uid}/${historyKey}`]: historyEntry,
  };

  await db.ref().update(updates);

  assignDiscordRole(uid);
}
