import {onCall, HttpsError} from "firebase-functions/https";
import admin from "firebase-admin";
import {db} from "../../config/firebase.js";
import {validateAdminRequest} from "../../utils/validateAdminRequest.js";
import {defaultOptions} from "../../config/options.js";

export const incrementTournamentCount = onCall(
    defaultOptions, async (request) => {
      await validateAdminRequest(request);

      const {tournamentId} = request.data;
      if (!tournamentId) {
        throw new HttpsError("invalid-argument", "tournamentId is required");
      }

      const registrationsSnap = await db
          .ref(`tournaments/${tournamentId}/registrations`)
          .once("value");
      const registrations = registrationsSnap.val() ?? {};

      const updates = {};
      for (const [uid, registration] of Object.entries(registrations)) {
        if (!registration.approved) continue;
        updates[`players/${uid}/playedTournamentCount`] =
        admin.database.ServerValue.increment(1);
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpsError("failed-precondition",
            "No approved participants found for this tournament");
      }

      await db.ref().update(updates);

      return {success: true};
    });
