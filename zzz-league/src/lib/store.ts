import { derived, writable } from 'svelte/store'
import type { Player, Tournament } from './types';
import { hasRole } from './roles';

export const currentUser = writable<Player | null>(null);
export const role = writable<string>("player");
export const isAdmin = derived(role, ($role) => hasRole($role, "admin"));
export const isModerator = derived(role, ($role) => hasRole($role, "moderator"));

export const players = writable<Player[]>([]);
export const tournaments = writable<Tournament[]>([]);

export const playersByUid = derived(players, ($players) => {
	const map = new Map<string, Player>();
	for (const p of $players) map.set(p.uid, p);
	return map;
});

export const loginOpen = writable(false);
export const registerOpen = writable(false);
export const settingsOpen = writable(false);
export const profileUser = writable<Player | null>(null);
export const viewingImage = writable<string>("");