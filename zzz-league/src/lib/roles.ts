export const ROLE_RANK: Record<string, number> = {
	player: 0,
	moderator: 1,
	admin: 2,
};

export function hasRole(role: string | undefined | null, minRole: string): boolean {
	return (ROLE_RANK[role ?? "player"] ?? 0) >= ROLE_RANK[minRole];
}
