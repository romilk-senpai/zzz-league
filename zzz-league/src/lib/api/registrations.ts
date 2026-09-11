import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import type { TournamentRegistration } from '../types';
import { epoch, fileToBase64, type TournamentRegistrationDto } from './dtos';

function toRegistration(dto: TournamentRegistrationDto): TournamentRegistration {
	return {
		...dto,
		registrationTimestamp: epoch(dto.registeredAt),
	};
}

export async function listRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
	return (await apiGet<TournamentRegistrationDto[]>(`/api/tournaments/${tournamentId}/registrations`)).map(
		toRegistration,
	);
}

export interface RegistrationFormInput {
	gameUid: string;
	prizeUid: string;
	prizeAsMoney: boolean;
	darteNickname: string;
	darteAccount: string;
	dartePreset: string;
	rosterScreenshot: File | null;
	hoyolabScreenshot: File | null;
}

async function detailsRequestBody(input: RegistrationFormInput) {
	return {
		gameUid: input.gameUid,
		prizeAsMoney: input.prizeAsMoney,
		prizeUid: input.prizeAsMoney ? null : input.prizeUid,
		darteNickname: input.darteNickname,
		dartePresetName: input.darteAccount,
		rosterName: input.dartePreset,
		rosterScreenshot: input.rosterScreenshot ? await fileToBase64(input.rosterScreenshot) : undefined,
		hoyolabScreenshot: input.hoyolabScreenshot ? await fileToBase64(input.hoyolabScreenshot) : undefined,
	};
}

export async function applyForTournament(
	tournamentId: string,
	playerId: string,
	input: RegistrationFormInput,
): Promise<TournamentRegistration> {
	const dto = await apiPost<TournamentRegistrationDto>(`/api/tournaments/${tournamentId}/registrations/solo`, {
		playerId,
		details: await detailsRequestBody(input),
	});
	return toRegistration(dto);
}

export async function applyForTeamTournament(
	tournamentId: string,
	teamId: string,
	player1: RegistrationFormInput,
	player2: RegistrationFormInput,
): Promise<TournamentRegistration> {
	const dto = await apiPost<TournamentRegistrationDto>(`/api/tournaments/${tournamentId}/registrations/team`, {
		teamId,
		player1: await detailsRequestBody(player1),
		player2: await detailsRequestBody(player2),
	});
	return toRegistration(dto);
}

export async function cancelTournamentRegistration(tournamentId: string): Promise<void> {
	await apiDelete(`/api/tournaments/${tournamentId}/registrations`);
}

export async function approveRegistration(
	tournamentId: string,
	registrationId: string,
	approved: boolean,
): Promise<TournamentRegistration> {
	const dto = await apiPut<TournamentRegistrationDto>(
		`/api/tournaments/${tournamentId}/registrations/${registrationId}/approve`,
		{ approved },
	);
	return toRegistration(dto);
}

export async function adminAddTournamentRegistration(tournamentId: string, playerId: string): Promise<TournamentRegistration> {
	const dto = await apiPost<TournamentRegistrationDto>(`/api/tournaments/${tournamentId}/registrations/admin-add`, {
		playerId,
	});
	return toRegistration(dto);
}

export async function adminAddTeamRegistration(tournamentId: string, teamId: string): Promise<TournamentRegistration> {
	const dto = await apiPost<TournamentRegistrationDto>(`/api/tournaments/${tournamentId}/registrations/admin-add-team`, {
		teamId,
	});
	return toRegistration(dto);
}
