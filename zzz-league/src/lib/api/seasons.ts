import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { Archive } from '../types';
import { epoch, type ArchiveDto } from './dtos';

function toArchive(dto: ArchiveDto): Archive {
	return {
		...dto,
		createdAt: epoch(dto.createdAt),
	};
}

export async function finalizeTournament(): Promise<void> {
	await apiPost('/api/seasons/finalize');
}

export async function resetSeason(seasonName: string): Promise<void> {
	await apiPost('/api/seasons/reset', { seasonName });
}

export async function backfillLastPlayedTimestamps(): Promise<{ updatedPlayers: number }> {
	return apiPost<{ updatedPlayers: number }>('/api/seasons/backfill-last-played-timestamps');
}

export async function listArchives(): Promise<Archive[]> {
	return (await apiGet<ArchiveDto[]>('/api/archives')).map(toArchive);
}

export async function deleteArchive(seasonName: string): Promise<void> {
	await apiDelete(`/api/archives/${seasonName}`);
}

export async function getSeasonTimer(): Promise<number | null> {
	const dto = await apiGet<{ endTimestamp: string | null }>('/api/seasons/timer');
	return dto.endTimestamp ? epoch(dto.endTimestamp) : null;
}

export async function setSeasonTimer(endTimestamp: number): Promise<void> {
	await apiPut('/api/seasons/timer', { endTimestamp: new Date(endTimestamp).toISOString() });
}
