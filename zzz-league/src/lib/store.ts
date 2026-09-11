import { derived, get, writable } from 'svelte/store'
import type { Player, PlayerListItem, PlayerRole, Tournament } from './types';
import { hasRole } from './roles';
import { getPlayer, getSeasonTimer, getTournament, listTournaments } from './backend';

export const currentUser = writable<Player | null>(null);
export const role = writable<PlayerRole>("player");
export const isAdmin = derived(role, ($role) => hasRole($role, "admin"));
export const isModerator = derived(role, ($role) => hasRole($role, "moderator"));

export const tournaments = writable<Tournament[]>([]);

export const seasonTimerEndsAt = writable<number | null>(null);

export async function refreshSeasonTimer(): Promise<void> {
	seasonTimerEndsAt.set(await getSeasonTimer());
}

export const loginOpen = writable(false);
export const settingsOpen = writable(false);
export const profileUser = writable<PlayerListItem | null>(null);
export const viewingImage = writable<string>("");

// ---- REST-backed data loading, replacing the old onValue-fed stores ----

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

// Applies an already-fetched updated Player (from a mutation response) to currentUser, if it's
// the logged-in user — avoids a redundant re-fetch of data the mutation's response already gave
// us. (Used to also patch a global players list; that list is gone now — see the player-list
// refactor — each view owns its own player data instead.)
export function applyPlayerUpdate(updated: Player): void {
	if (get(currentUser)?.uid === updated.uid) {
		currentUser.set(updated);
		role.set(updated.role);
	}
}
