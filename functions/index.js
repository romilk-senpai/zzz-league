const admin = require("firebase-admin");

const { defineSecret } = require("firebase-functions/params");

const DISCORD_BOT_TOKEN = defineSecret("DISCORD_BOT_TOKEN");
exports.DISCORD_BOT_TOKEN = DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = defineSecret("DISCORD_GUILD_ID");
exports.DISCORD_GUILD_ID = DISCORD_GUILD_ID;
const DISCORD_NEWBIE_ROLE = defineSecret("DISCORD_NEWBIE_ROLE");
exports.DISCORD_NEWBIE_ROLE = DISCORD_NEWBIE_ROLE;
const DISCORD_MID_ROLE = defineSecret("DISCORD_MID_ROLE");
exports.DISCORD_MID_ROLE = DISCORD_MID_ROLE;
const DISCORD_HIGH_ROLE = defineSecret("DISCORD_HIGH_ROLE");
exports.DISCORD_HIGH_ROLE = DISCORD_HIGH_ROLE;
const DISCORD_CLIENT_ID = defineSecret("DISCORD_CLIENT_ID");
exports.DISCORD_CLIENT_ID = DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");
exports.DISCORD_CLIENT_SECRET = DISCORD_CLIENT_SECRET;
const CHALLONGE_API_KEY = defineSecret("CHALLONGE_API_KEY");
exports.CHALLONGE_API_KEY = CHALLONGE_API_KEY;

const { setGlobalOptions } = require("firebase-functions");
const { HttpsError } = require("firebase-functions/https");
const { getStorage } = require("firebase-admin/storage");
const { validateAdminRequest } = require("./admin/utils");

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

admin.initializeApp();

const db = admin.database();
exports.db = db;
const auth = admin.auth();
exports.auth = auth;
const storage = getStorage();
exports.storage = storage;

exports.validateAdminRequest = validateAdminRequest;

async function assignDiscordRole(uid) {
  const snap = await db.ref("players/" + uid).once("value");
  const player = snap.val();
  if (!player?.discordId) return;

  const elo = player.elo || 1000;
  const guildId = DISCORD_GUILD_ID.value();
  const token = DISCORD_BOT_TOKEN.value();

  const newbieRole = DISCORD_NEWBIE_ROLE.value();
  const midRole = DISCORD_MID_ROLE.value();
  const highRole = DISCORD_HIGH_ROLE.value();

  const newRoleId = elo >= 1400 ? highRole :
    elo >= 1200 ? midRole :
      newbieRole;

  const allRoles = [newbieRole, midRole, highRole];

  await Promise.all(allRoles.map((roleId) =>
    fetch(`https://discord.com/api/guilds/${guildId}/members/${player.discordId}/roles/${roleId}`, {
      method: roleId === newRoleId ? "PUT" : "DELETE",
      headers: { Authorization: `Bot ${token}` },
    }),
  ));
}
exports.assignDiscordRole = assignDiscordRole;

async function updateTournamentGames(tournamentId, challongeTournamentId) {
  const headers = {
    "Content-Type": "application/vnd.api+json",
    "Accept": "application/json",
    "Authorization-Type": "v1",
    "Authorization": CHALLONGE_API_KEY.value(),
  };

  const snap = await
    db.ref(`tournaments/${tournamentId}/challongeParticipants`)
      .once("value");
  const challongeParticipants = snap.val();
  if (!challongeParticipants) {
    throw new HttpsError("not-found", "No participants data found");
  }

  const matchesRes = await
    fetch(`https://api.challonge.com/v2.1/tournaments/${challongeTournamentId}/matches.json`, {
      method: "GET",
      headers,
    });

  const matchesData = await matchesRes.json();
  if (!matchesRes.ok) {
    throw new HttpsError("internal",
      `Challonge matches fetch error: ${JSON.stringify(matchesData)}`);
  }

  const matches = Object.fromEntries(
    matchesData.data.map((m) => {
      const pp = m.attributes.points_by_participant ?? [];
      const p1Id = pp[0]?.participant_id;
      const p2Id = pp[1]?.participant_id;
      return [
        m.id,
        {
          id: m.id,
          state: m.attributes.state,
          winnerId: m.attributes.winner_id,
          p1: challongeParticipants[p1Id] ?? "TBD",
          p2: challongeParticipants[p2Id] ?? "TBD",
        },
      ];
    }),
  );

  await db.ref(`tournaments/${tournamentId}/matches`).set(matches);
}
exports.updateTournamentGames = updateTournamentGames;

