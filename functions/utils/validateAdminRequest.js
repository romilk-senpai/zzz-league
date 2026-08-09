import {HttpsError} from "firebase-functions/https";
import {db} from "../config/firebase.js";
import {hasRole} from "./roles.js";

export async function requireRole(request, minRole) {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerSnapshot = await db.ref("players/" + callerUid).once("value");
  const caller = callerSnapshot.val();
  if (!caller || !hasRole(caller, minRole)) {
    throw new HttpsError("permission-denied", "Permission denied");
  }
}

export async function validateAdminRequest(request) {
  await requireRole(request, "admin");
}
