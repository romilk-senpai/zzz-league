import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { Tournament, TournamentGameMode, TournamentRegistrationKind } from '../types';
import { epoch, type TournamentDto } from './dtos';

function toTournament(dto: TournamentDto): Tournament {
	return {
		...dto,
		type: dto.bracketType,
		registrationStartDate: epoch(dto.registrationStartDate),
		registrationEndDate: epoch(dto.registrationEndDate),
		tournamentStartDate: epoch(dto.tournamentStartDate),
		tournamentEndDate: epoch(dto.tournamentEndDate),
	};
}

export async function listTournaments(): Promise<Tournament[]> {
	return (await apiGet<TournamentDto[]>('/api/tournaments')).map((dto) => toTournament(dto));
}

export async function getTournament(id: string): Promise<Tournament | null> {
	try {
		return toTournament(await apiGet<TournamentDto>(`/api/tournaments/${id}`));
	} catch {
		return null;
	}
}

export interface CreateTournamentInput {
	name: string;
	description: string;
	registrationType: TournamentRegistrationKind;
	gameMode: TournamentGameMode;
	registrationStartDate: number;
	registrationEndDate: number;
	tournamentStartDate: number;
	tournamentEndDate: number;
	minCost: number;
	maxCost: number;
	minCharacters: number;
	minTier: number;
	maxTier: number;
	overrideEloChange: number;
	bracketType: string;
	consolationMatchesTargetRank: number | null;
	visible: boolean;
	discordRoleName: string;
	discordChannelName: string;
}

// registrationType rides along for create (the server DTO wants it) and is a harmless extra
// property for update (its DTO has no such field, and unknown JSON properties are ignored).
function tournamentRequestBody(input: CreateTournamentInput) {
	return {
		...input,
		registrationStartDate: new Date(input.registrationStartDate).toISOString(),
		registrationEndDate: new Date(input.registrationEndDate).toISOString(),
		tournamentStartDate: new Date(input.tournamentStartDate).toISOString(),
		tournamentEndDate: new Date(input.tournamentEndDate).toISOString(),
	};
}

export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
	const dto = await apiPost<TournamentDto>('/api/tournaments', tournamentRequestBody(input));
	return toTournament(dto);
}

export async function updateTournament(id: string, input: CreateTournamentInput): Promise<Tournament> {
	const dto = await apiPut<TournamentDto>(`/api/tournaments/${id}`, tournamentRequestBody(input));
	return toTournament(dto);
}

export async function closeTournamentRegistration(id: string): Promise<Tournament> {
	return toTournament(await apiPost<TournamentDto>(`/api/tournaments/${id}/close-registration`));
}

export async function createChallongeBracket(id: string): Promise<Tournament> {
	return toTournament(await apiPost<TournamentDto>(`/api/tournaments/${id}/challonge-bracket`));
}

export async function startChallongeTournament(id: string): Promise<Tournament> {
	return toTournament(await apiPost<TournamentDto>(`/api/tournaments/${id}/start`));
}

export async function finishTournament(id: string): Promise<Tournament> {
	return toTournament(await apiPost<TournamentDto>(`/api/tournaments/${id}/finish`));
}

export async function updateTournamentGames(id: string): Promise<void> {
	await apiPost(`/api/tournaments/${id}/refresh-games`);
}

export async function incrementTournamentCount(id: string): Promise<void> {
	await apiPost(`/api/tournaments/${id}/increment-count`);
}

export async function incrementSeasonalTournamentCount(id: string): Promise<void> {
	await apiPost(`/api/tournaments/${id}/increment-seasonal-count`);
}

export async function splitTournament(id: string, divisionGroups: string[][]): Promise<string[]> {
	const result = await apiPost<{ divisionTournamentIds: string[] }>(`/api/tournaments/${id}/split`, {
		divisionGroups,
	});
	return result.divisionTournamentIds;
}

export async function deleteTournament(id: string): Promise<void> {
	await apiDelete(`/api/tournaments/${id}`);
}
