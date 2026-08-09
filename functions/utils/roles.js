export const ROLE_RANK = {
  player: 0,
  moderator: 1,
  admin: 2,
};

export function hasRole(player, minRole) {
  const rank = ROLE_RANK[player?.role] ?? 0;
  return rank >= ROLE_RANK[minRole];
}
