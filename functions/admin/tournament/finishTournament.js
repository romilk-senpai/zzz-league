import {onCall, HttpsError} from "firebase-functions/https";
import {db} from "../../config/firebase.js";
import {
  CHALLONGE_API_KEY,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
} from "../../config/secrets.js";
import {
  deleteTournamentDiscordChannel,
  deleteTournamentDiscordRole,
} from "../../discord/tournamentDiscordResources.js";
import {validateAdminRequest} from "../../utils/validateAdminRequest.js";
import {defaultOptions} from "../../config/options.js";
import {TOURNAMENT_STATE} from "../../utils/tournamentState.js";
import {setPlayerElo} from "../../utils/setPlayerElo.js";

const PRIZE_ELO_BONUS = {1: 40, 2: 20, 3: 10};

async function fetchAllParticipants(challongeTournamentId, headers) {
  const participants = [];
  let url = `https://api.challonge.com/v2.1/tournaments/${challongeTournamentId}/participants.json`;

  while (url) {
    const res = await fetch(url, {method: "GET", headers});
    const data = await res.json();
    if (!res.ok) {
      throw new HttpsError("internal",
          `Challonge participants error: ${JSON.stringify(data)}`);
    }
    participants.push(...data.data);
    url = data.links?.next ?? null;
  }

  return participants;
}

async function awardPrizeElo(participants, challongeParticipants) {
  const prizeParticipants = participants.filter(
      (item) => PRIZE_ELO_BONUS[item.attributes.final_rank] !== undefined,
  );

  for (const participant of prizeParticipants) {
    const uid = challongeParticipants[participant.id];
    if (!uid) continue;

    const bonus = PRIZE_ELO_BONUS[participant.attributes.final_rank];
    const playerSnap = await db.ref("players/" + uid).once("value");
    if (!playerSnap.exists()) continue;

    const newElo = (playerSnap.val().elo || 1000) + bonus;
    await setPlayerElo(uid, newElo);
  }
}

export const finishTournament = onCall({
  ...defaultOptions,
  secrets: [CHALLONGE_API_KEY, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID],
}, async (request) => {
  await validateAdminRequest(request);

  const {tournamentId} = request.data;
  if (!tournamentId) {
    throw new HttpsError("invalid-argument", "tournamentId is required");
  }

  const tournamentSnap =
    await db.ref("tournaments/" + tournamentId).once("value");
  const tournament = tournamentSnap.val();
  if (!tournament) {
    throw new HttpsError("not-found", "Tournament not found");
  }

  const headers = {
    "Content-Type": "application/vnd.api+json",
    "Accept": "application/json",
    "Authorization-Type": "v1",
    "Authorization": CHALLONGE_API_KEY.value(),
  };

  const finalizeRes = await fetch(`https://api.challonge.com/v2.1/tournaments/${tournament.challongeTournamentId}/change_state.json`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      data: {
        type: "TournamentState",
        attributes: {
          state: "finalize",
        },
      },
    }),
  });

  const finalizeData = await finalizeRes.json();
  if (!finalizeRes.ok && finalizeRes.status !== 422) {
    throw new HttpsError("internal",
        `Challonge error: ${JSON.stringify(finalizeData)}`);
  }

  const participants = await fetchAllParticipants(
      tournament.challongeTournamentId, headers);

  const winner = participants.find(
      (item) => item.attributes.final_rank === 1,
  );
  if (!winner) {
    throw new HttpsError("internal",
        "Could not find a participant with final_rank 1");
  }

  const challongeWinnerId = winner.id;
  const winnerId = tournament.challongeParticipants[challongeWinnerId];

  await db.ref("tournaments/" + tournamentId).update({
    state: TOURNAMENT_STATE.COMPLETE,
    challongeWinnerId,
    winnerId,
  });

  await awardPrizeElo(participants, tournament.challongeParticipants);

  await deleteTournamentDiscordChannel(tournamentId);
  await deleteTournamentDiscordRole(tournamentId);

  return {success: true};
});
