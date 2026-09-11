import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { Team, TeamCursor, TeamPage } from '../types';
import { epoch, fileToBase64, type TeamDto, type TeamPageDto } from './dtos';

function toTeam(dto: TeamDto): Team {
	return {
		...dto,
		createdAt: epoch(dto.createdAt),
	};
}

export async function listMyTeams(uid: string): Promise<Team[]> {
	return (await apiGet<TeamDto[]>(`/api/teams/by-player/${uid}`)).map(toTeam);
}

export async function listTeamsPage(cursor?: TeamCursor | null, take = 20): Promise<TeamPage> {
	const params = new URLSearchParams({ take: String(take) });
	if (cursor) {
		params.set('beforeCreatedAt', new Date(cursor.createdAt).toISOString());
		params.set('beforeId', cursor.id);
	}
	const dto = await apiGet<TeamPageDto>(`/api/teams?${params.toString()}`);
	return { teams: dto.teams.map(toTeam), hasMore: dto.hasMore };
}

export async function getTeam(id: string): Promise<Team | null> {
	try {
		return toTeam(await apiGet<TeamDto>(`/api/teams/${id}`));
	} catch {
		return null;
	}
}

export async function createTeam(
	creatorPlayerId: string,
	player2PlayerId: string,
	name: string,
	photo: File | null = null,
): Promise<Team> {
	const photoBase64 = photo ? await fileToBase64(photo) : null;
	return toTeam(await apiPost<TeamDto>('/api/teams', { creatorPlayerId, player2PlayerId, name, photo: photoBase64 }));
}

export async function updateTeam(id: string, name: string, player2PlayerId: string, photo: File | null = null): Promise<Team> {
	const photoBase64 = photo ? await fileToBase64(photo) : null;
	return toTeam(await apiPut<TeamDto>(`/api/teams/${id}`, { name, player2PlayerId, photo: photoBase64 }));
}

export async function deleteTeam(id: string): Promise<void> {
	await apiDelete(`/api/teams/${id}`);
}
