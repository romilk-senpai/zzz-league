import {onCall, HttpsError} from "firebase-functions/https";
import {db} from "../config/firebase.js";
import {defaultOptions} from "../config/options.js";
import {isLocked} from "../utils/tournamentState.js";

export const cancelTournamentRegistration = onCall(
    defaultOptions,
    async (request) => {
      const callerUid = request.auth?.uid;
      if (!callerUid) {
        throw new HttpsError("unauthenticated", "Not logged in");
      }

      const {tournamentId} = request.data;
      if (!tournamentId) {
        throw new HttpsError("invalid-argument", "tournamentId is required");
      }

      const tournamentSnap =
      await db.ref(`tournaments/${tournamentId}`).once("value");
      if (!tournamentSnap.exists()) {
        throw new HttpsError("not-found", "Tournament not found");
      }
      const tournament = tournamentSnap.val();

      if (isLocked(tournament.state) || tournament.challongeTournamentId) {
        throw new HttpsError("failed-precondition",
            "Tournament has already started");
      }

      const regRef =
      db.ref(`tournaments/${tournamentId}/registrations/${callerUid}`);
      const regSnap = await regRef.once("value");
      if (!regSnap.exists()) {
        throw new HttpsError("not-found", "Registration not found");
      }

      await regRef.remove();

      return {success: true};
    },
);
