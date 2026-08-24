const MID_TIER_PROMOTE_ELO = 1200;
const MID_TIER_DEMOTE_ELO = 1150;
const HIGH_TIER_PROMOTE_ELO = 1400;
const HIGH_TIER_DEMOTE_ELO = 1350;

export function computeTierConfirmation(player, elo) {
  let isMidConfirmed = player.isMidConfirmed || false;
  let isHighConfirmed = player.isHighConfirmed || false;

  if (isMidConfirmed && elo < MID_TIER_DEMOTE_ELO) isMidConfirmed = false;
  if (!isMidConfirmed && elo >= MID_TIER_PROMOTE_ELO) isMidConfirmed = true;
  if (isHighConfirmed && elo < HIGH_TIER_DEMOTE_ELO) isHighConfirmed = false;
  if (!isHighConfirmed && elo >= HIGH_TIER_PROMOTE_ELO) isHighConfirmed = true;

  return {isMidConfirmed, isHighConfirmed};
}
