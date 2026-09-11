import { apiDelete, apiGet, apiPost } from '../api';
import type { HistoryCursor, HistoryEntry, HistoryPage } from '../types';
import { epoch, type HistoryEntryDto, type HistoryPageDto } from './dtos';

function toHistoryEntry(dto: HistoryEntryDto): HistoryEntry {
	return {
		...dto,
		kind: dto.kind as HistoryEntry['kind'],
		timestamp: epoch(dto.timestamp),
	};
}

function toHistoryPage(dto: HistoryPageDto): HistoryPage {
	return { entries: dto.entries.map(toHistoryEntry), hasMore: dto.hasMore };
}

export async function registerMatch(
	p1: string,
	p2: string,
	p1Win: boolean,
	overrideEloChange: number,
	techLoss: boolean = false,
): Promise<HistoryEntry> {
	const dto = await apiPost<HistoryEntryDto>('/api/history/matches', {
		p1PlayerId: p1,
		p2PlayerId: p2,
		p1Win,
		overrideEloChange,
		techLoss,
	});
	return toHistoryEntry(dto);
}

export interface EloPreview {
	p1ChangeOnWin: number;
	p1ChangeOnLoss: number;
	p2ChangeOnWin: number;
	p2ChangeOnLoss: number;
}

// Non-authoritative preview for the admin match-registration tool's Elo forecast — computed
// server-side by the exact same formula real match registration uses (see
// HistoryService.PreviewEloChangeAsync), instead of a separately maintained frontend copy.
export async function previewEloChange(p1Uid: string, p2Uid: string): Promise<EloPreview> {
	const params = new URLSearchParams({ p1Uid, p2Uid });
	return apiGet<EloPreview>(`/api/history/elo-preview?${params}`);
}

function historyPageQuery(cursor: HistoryCursor | null | undefined, take: number): string {
	const params = new URLSearchParams({ take: String(take) });
	if (cursor) {
		params.set('beforeTimestamp', new Date(cursor.timestamp).toISOString());
		params.set('beforeId', cursor.id);
	}
	return params.toString();
}

export async function listHistoryPage(cursor?: HistoryCursor | null, take = 50): Promise<HistoryPage> {
	const dto = await apiGet<HistoryPageDto>(`/api/history?${historyPageQuery(cursor, take)}`);
	return toHistoryPage(dto);
}

export async function listHistoryByPlayerPage(uid: string, cursor?: HistoryCursor | null, take = 50): Promise<HistoryPage> {
	const dto = await apiGet<HistoryPageDto>(`/api/history/player/${uid}?${historyPageQuery(cursor, take)}`);
	return toHistoryPage(dto);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
	await apiDelete(`/api/history/${id}`);
}
