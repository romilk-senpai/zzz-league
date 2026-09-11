import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { Player, PlayerListItem } from '../types';
import { epoch, type PlayerDto, type PlayerListItemDto } from './dtos';

export function toPlayer(dto: PlayerDto): Player {
	return {
		...dto,
		lastPlayedTournamentTimestamp: dto.lastPlayedTournamentTimestamp
			? epoch(dto.lastPlayedTournamentTimestamp)
			: undefined,
		avatar: dto.avatar ?? undefined,
		lastRegistration: dto.lastRegistration ?? undefined,
	};
}

export function toPlayerListItem(dto: PlayerListItemDto): PlayerListItem {
	return {
		...dto,
		lastPlayedTournamentTimestamp: dto.lastPlayedTournamentTimestamp
			? epoch(dto.lastPlayedTournamentTimestamp)
			: undefined,
		avatar: dto.avatar ?? undefined,
	};
}

// uids: batch-resolve a known set of players (e.g. a tournament's registrants); omit for the
// whole roster. Always the lean PlayerListItem shape — use getPlayer for a full single Player.
export async function listPlayers(uids?: string[]): Promise<PlayerListItem[]> {
	const query = uids?.length ? `?uids=${uids.map(encodeURIComponent).join(',')}` : '';
	return (await apiGet<PlayerListItemDto[]>(`/api/players${query}`)).map(toPlayerListItem);
}

export async function getPlayer(uid: string): Promise<Player | null> {
	try {
		return toPlayer(await apiGet<PlayerDto>(`/api/players/${uid}`));
	} catch {
		return null;
	}
}

export async function addPlayer(name: string): Promise<Player> {
	const trimmed = name.trim();
	return toPlayer(await apiPost<PlayerDto>('/api/players', { uid: trimmed, name: trimmed }));
}

export async function deletePlayer(uid: string): Promise<void> {
	await apiDelete(`/api/players/${uid}`);
}

export async function updatePlayerElo(uid: string, elo: number): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/elo`, { elo }));
}

export async function updateProfile(uid: string, name: string): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/name`, { name }));
}

export async function updateAvatar(uid: string, avatar: string): Promise<Player> {
	return toPlayer(await apiPut<PlayerDto>(`/api/players/${uid}/avatar`, { avatar }));
}
