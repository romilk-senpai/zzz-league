import { apiGet, apiPost } from '../api';
import type { TournamentMatch } from '../types';
import { fileToBase64, type TournamentMatchDto } from './dtos';

function toMatch(dto: TournamentMatchDto): TournamentMatch {
	return {
		...dto,
		p1: dto.p1PlayerId,
		p2: dto.p2PlayerId,
		winnerId: dto.winnerPlayerId,
		resultScreenshot: dto.resultScreenshotUrl,
		techLossUid: dto.techLossPlayerId,
	};
}

export async function listMatches(tournamentId: string): Promise<TournamentMatch[]> {
	return (await apiGet<TournamentMatchDto[]>(`/api/tournaments/${tournamentId}/matches`)).map(toMatch);
}

export async function approveResult(
	tournamentId: string,
	matchId: string,
	resultP1: string,
	resultP2: string,
	resultScreenshot: File | null = null,
): Promise<TournamentMatch> {
	const dto = await apiPost<TournamentMatchDto>(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
		resultP1,
		resultP2,
		resultScreenshot: resultScreenshot ? await fileToBase64(resultScreenshot) : undefined,
	});
	return toMatch(dto);
}

export async function adminSetMatchResult(
	tournamentId: string,
	matchId: string,
	resultP1: string | null,
	resultP2: string | null,
	resultScreenshot: File | null = null,
	techLossUid: string | null = null,
	techLossTeamId: string | null = null,
): Promise<TournamentMatch> {
	const dto = await apiPost<TournamentMatchDto>(`/api/tournaments/${tournamentId}/matches/${matchId}/admin-result`, {
		resultP1,
		resultP2,
		resultScreenshot: resultScreenshot ? await fileToBase64(resultScreenshot) : undefined,
		techLossPlayerId: techLossUid,
		techLossTeamId,
	});
	return toMatch(dto);
}
