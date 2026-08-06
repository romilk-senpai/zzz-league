import {onCall, HttpsError} from "firebase-functions/https";
import {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
} from "../config/secrets.js";
import {validateAdminRequest} from "../utils/validateAdminRequest.js";
import {defaultOptions} from "../config/options.js";
import {setPlayerElo} from "../utils/setPlayerElo.js";

export const updatePlayerElo = onCall({
  ...defaultOptions,
  secrets: [
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID,
  ],
}, async (request) => {
  await validateAdminRequest(request);

  const {uid, elo} = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  await setPlayerElo(uid, elo);

  return {success: true};
});
