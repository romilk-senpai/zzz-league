import { derived, writable } from 'svelte/store'
import type { Player, PlayerRole, Tournament } from './types';
import { hasRole } from './roles';
import { getPlayer, getSeasonTimer, getTournament, listPlayers, listTournaments } from './backend';

export const currentUser = writable<Player | null>(null);
export const role = writable<PlayerRole>("player");
export const isAdmin = derived(role, ($role) => hasRole($role, "admin"));
export const isModerator = derived(role, ($role) => hasRole($role, "moderator"));

export const players = writable<Player[]>([]);
export const tournaments = writable<Tournament[]>([]);

export const playersByUid = derived(players, ($players) => {
	const map = new Map<string, Player>();
	for (const p of $players) map.set(p.uid, p);
	return map;
});

export const seasonTimerEndsAt = writable<number | null>(null);

export async function refreshSeasonTimer(): Promise<void> {
	seasonTimerEndsAt.set(await getSeasonTimer());
}

export const loginOpen = writable(false);
export const settingsOpen = writable(false);
export const profileUser = writable<Player | null>(null);
export const viewingImage = writable<string>("");

// ---- REST-backed data loading, replacing the old onValue-fed stores ----

export async function refreshPlayers(): Promise<void> {
	players.set(await listPlayers());
}

export async function refreshTournaments(): Promise<void> {
	tournaments.set(await listTournaments());
}

// Called from the root layout on SignalR's list-group "TournamentChanged" push — upserts just the
// one affected tournament instead of refetching the whole list.
export async function refreshOneTournament(tournamentId: string): Promise<void> {
	const updated = await getTournament(tournamentId);
	tournaments.update(($tournaments) => {
		const index = $tournaments.findIndex((t) => t.id === tournamentId);
		if (!updated) {
			return index === -1 ? $tournaments : $tournaments.filter((t) => t.id !== tournamentId);
		}
		if (index === -1) return [...$tournaments, updated];
		const next = [...$tournaments];
		next[index] = updated;
		return next;
	});
}

export async function refreshCurrentUser(uid: string): Promise<void> {
	const player = await getPlayer(uid);
	currentUser.set(player);
	role.set(player?.role ?? "player");
}
