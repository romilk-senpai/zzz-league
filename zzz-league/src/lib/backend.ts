// REST wrappers against ZenlessLeague.Api, replacing the Firebase Cloud Functions callables in
// firebase.ts for everything except auth-adjacent flows (registerUser/linkDiscord/unlinkDiscord,
// explicitly out of scope — those stay on Firebase Functions until the auth migration phase).
import { apiDelete, apiGet, apiPost, apiPut } from './api';
import type {
	Archive,
	ArchivedPlayerSnapshot,
	HistoryCursor,
	HistoryEntry,
	HistoryPage,
	Player,
	PlayerRegistrationDetails,
	PlayerRole,
	PlayerSummary,
	Team,
	TeamCursor,
	TeamPage,
	Tournament,
	TournamentMatch,
	TournamentRegistration,
	TournamentRegistrationKind,
} from './types';

// ---- raw API DTO shapes (camelCase JSON, ISO date strings, snake_case string enums) ----

interface LastRegistrationCacheDto {
	gameUid: string;
	prizeAsMoney: boolean;
	prizeUid: string | null;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

interface PlayerDto {
	uid: string;
	name: string;
	discordId: string | null;
	discordUsername: string | null;
	elo: number;
	tournamentPoints: number;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
	wins: number;
	losses: number;
	playedTournamentCount: number;
	seasonalPlayedTournamentCount: number;
	lastPlayedTournamentTimestamp: string | null;
	avatar: string | null;
	role: PlayerRole;
	createdAt: string;
	lastRegistration: LastRegistrationCacheDto | null;
}

interface TournamentDto {
	id: string;
	name: string;
	description: string | null;
	registrationStartDate: string;
	registrationEndDate: string;
	tournamentStartDate: string;
	tournamentEndDate: string;
	minCost: number;
	maxCost: number;
	minCharacters: number;
	minTier: number;
	maxTier: number;
	state: string;
	registrationType: TournamentRegistrationKind;
	visible: boolean;
	bracketType: string | null;
	challongeTournamentId: string | null;
	challongeTournamentUrl: string | null;
	challongeWinnerId: string | null;
	winnerId: string | null;
	winnerTeamId: string | null;
	divisionGroupId: string | null;
	divisionIndex: number | null;
	overrideEloChange: number | null;
	consolationMatchesTargetRank: number | null;
	discordRoleName: string | null;
	discordChannelName: string | null;
}

interface TournamentMatchDto {
	id: string;
	tournamentId: string;
	challongeMatchId: number;
	p1PlayerId: string | null;
	p2PlayerId: string | null;
	p1TeamId: string | null;
	p2TeamId: string | null;
	state: string;
	winnerPlayerId: string | null;
	winnerTeamId: string | null;
	resultScreenshotUrl: string | null;
	resultP1: string | null;
	resultP2: string | null;
	p1ApprovedResult: boolean;
	p2ApprovedResult: boolean;
	techLossPlayerId: string | null;
	techLossTeamId: string | null;
}

interface PlayerRegistrationDetailsDto {
	gameUid: string;
	prizeAsMoney: boolean;
	prizeUid: string | null;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

interface TournamentRegistrationDto {
	id: string;
	tournamentId: string;
	type: TournamentRegistrationKind;
	playerId: string | null;
	teamId: string | null;
	player1: PlayerRegistrationDetailsDto;
	player2: PlayerRegistrationDetailsDto | null;
	approved: boolean;
	registeredAt: string;
	updatedAt: string;
}

interface HistoryEntryDto {
	id: string;
	p1PlayerId: string;
	p1Change: number;
	p2PlayerId: string | null;
	p2Change: number | null;
	tournamentId: string | null;
	tournamentMatchId: string | null;
	kind: string;
	resultP1: string | null;
	resultP2: string | null;
	resultScreenshotUrl: string | null;
	timestamp: string;
}

interface HistoryPageDto {
	entries: HistoryEntryDto[];
	hasMore: boolean;
}

interface PlayerSummaryDto {
	uid: string;
	name: string;
	avatar: string | null;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

interface TeamDto {
	id: string;
	name: string;
	photoUrl: string | null;
	creator: PlayerSummaryDto;
	player2: PlayerSummaryDto;
	createdAt: string;
}

interface TeamPageDto {
	teams: TeamDto[];
	hasMore: boolean;
}

interface ArchivedPlayerSnapshotDto {
	name: string;
	elo: number;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

interface ArchiveDto {
	id: string;
	seasonName: string;
	createdAt: string;
	players: ArchivedPlayerSnapshotDto[];
}

// ---- DTO -> frontend type mapping (ISO strings become epoch millis here, and nowhere else) ----

const epoch = (iso: string) => Date.parse(iso);

function toPlayer(dto: PlayerDto): Player {
	return {
		uid: dto.uid,
		name: dto.name,
		discordId: dto.discordId,
		discordUsername: dto.discordUsername,
		elo: dto.elo,
		tournamentPoints: dto.tournamentPoints,
		isMidConfirmed: dto.isMidConfirmed,
		isHighConfirmed: dto.isHighConfirmed,
		wins: dto.wins,
		losses: dto.losses,
		playedTournamentCount: dto.playedTournamentCount,
		seasonalPlayedTournamentCount: dto.seasonalPlayedTournamentCount,
		lastPlayedTournamentTimestamp: dto.lastPlayedTournamentTimestamp
			? epoch(dto.lastPlayedTournamentTimestamp)
			: undefined,
		avatar: dto.avatar ?? undefined,
		role: dto.role,
		lastRegistration: dto.lastRegistration
			? {
					gameUid: dto.lastRegistration.gameUid,
					prizeUid: dto.lastRegistration.prizeUid,
					prizeAsMoney: dto.lastRegistration.prizeAsMoney,
					darteNickname: dto.lastRegistration.darteNickname,
					dartePresetName: dto.lastRegistration.dartePresetName,
					rosterName: dto.lastRegistration.rosterName,
					rosterScreenshotUrl: dto.lastRegistration.rosterScreenshotUrl,
					hoyolabScreenshotUrl: dto.lastRegistration.hoyolabScreenshotUrl,
				}
			: undefined,
	};
}

function toMatch(dto: TournamentMatchDto): TournamentMatch {
	return {
		id: dto.id,
		tournamentId: dto.tournamentId,
		challongeMatchId: dto.challongeMatchId,
		p1: dto.p1PlayerId,
		p2: dto.p2PlayerId,
		p1TeamId: dto.p1TeamId,
		p2TeamId: dto.p2TeamId,
		state: dto.state,
		winnerId: dto.winnerPlayerId,
		winnerTeamId: dto.winnerTeamId,
		resultScreenshot: dto.resultScreenshotUrl,
		resultP1: dto.resultP1,
		resultP2: dto.resultP2,
		p1ApprovedResult: dto.p1ApprovedResult,
		p2ApprovedResult: dto.p2ApprovedResult,
		techLossUid: dto.techLossPlayerId,
		techLossTeamId: dto.techLossTeamId,
	};
}

function toTournament(dto: TournamentDto, matches: TournamentMatch[] = []): Tournament {
	return {
		id: dto.id,
		name: dto.name,
		description: dto.description,
		registrationStartDate: epoch(dto.registrationStartDate),
		registrationEndDate: epoch(dto.registrationEndDate),
		tournamentStartDate: epoch(dto.tournamentStartDate),
		tournamentEndDate: epoch(dto.tournamentEndDate),
		minCost: dto.minCost,
		maxCost: dto.maxCost,
		minCharacters: dto.minCharacters,
		minTier: dto.minTier,
		maxTier: dto.maxTier,
		state: dto.state,
		registrationType: dto.registrationType,
		visible: dto.visible,
		type: dto.bracketType,
		challongeTournamentId: dto.challongeTournamentId,
		challongeTournamentUrl: dto.challongeTournamentUrl,
		challongeWinnerId: dto.challongeWinnerId,
		winnerId: dto.winnerId,
		winnerTeamId: dto.winnerTeamId,
		divisionGroupId: dto.divisionGroupId,
		divisionIndex: dto.divisionIndex,
		overrideEloChange: dto.overrideEloChange,
		consolationMatchesTargetRank: dto.consolationMatchesTargetRank,
		discordRoleName: dto.discordRoleName,
		discordChannelName: dto.discordChannelName,
		matches,
	};
}

function toDetails(dto: PlayerRegistrationDetailsDto): PlayerRegistrationDetails {
	return {
		gameUid: dto.gameUid,
		prizeAsMoney: dto.prizeAsMoney,
		prizeUid: dto.prizeUid,
		darteNickname: dto.darteNickname,
		dartePresetName: dto.dartePresetName,
		rosterName: dto.rosterName,
		rosterScreenshotUrl: dto.rosterScreenshotUrl,
		hoyolabScreenshotUrl: dto.hoyolabScreenshotUrl,
	};
}

function toRegistration(dto: TournamentRegistrationDto): TournamentRegistration {
	return {
		id: dto.id,
		tournamentId: dto.tournamentId,
		type: dto.type,
		playerId: dto.playerId,
		teamId: dto.teamId,
		player1: toDetails(dto.player1),
		player2: dto.player2 ? toDetails(dto.player2) : null,
		approved: dto.approved,
		registrationTimestamp: epoch(dto.registeredAt),
	};
}

function toHistoryEntry(dto: HistoryEntryDto): HistoryEntry {
	return {
		id: dto.id,
		p1PlayerId: dto.p1PlayerId,
		p1Change: dto.p1Change,
		p2PlayerId: dto.p2PlayerId,
		p2Change: dto.p2Change,
		tournamentId: dto.tournamentId,
		tournamentMatchId: dto.tournamentMatchId,
		kind: dto.kind as HistoryEntry['kind'],
		resultP1: dto.resultP1,
		resultP2: dto.resultP2,
		resultScreenshotUrl: dto.resultScreenshotUrl,
		timestamp: epoch(dto.timestamp),
	};
}

function toArchive(dto: ArchiveDto): Archive {
	return {
		id: dto.id,
		seasonName: dto.seasonName,
		createdAt: epoch(dto.createdAt),
		players: dto.players.map(
			(p): ArchivedPlayerSnapshot => ({
				name: p.name,
				elo: p.elo,
				isMidConfirmed: p.isMidConfirmed,
				isHighConfirmed: p.isHighConfirmed,
			}),
		),
	};
}

function toPlayerSummary(dto: PlayerSummaryDto): PlayerSummary {
	return {
		uid: dto.uid,
		name: dto.name,
		avatar: dto.avatar,
		isMidConfirmed: dto.isMidConfirmed,
		isHighConfirmed: dto.isHighConfirmed,
	};
}

function toTeam(dto: TeamDto): Team {
	return {
		id: dto.id,
		name: dto.name,
		photoUrl: dto.photoUrl,
		creator: toPlayerSummary(dto.creator),
		player2: toPlayerSummary(dto.player2),
		createdAt: epoch(dto.createdAt),
	};
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// ---- Players ----

export async function listPlayers(): Promise<Player[]> {
	return (await apiGet<PlayerDto[]>('/api/players')).map(toPlayer);
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

// ---- Tournaments ----

export async function listTournaments(): Promise<Tournament[]> {
	return (await apiGet<TournamentDto[]>('/api/tournaments')).map((dto) => toTournament(dto));
}

export async function getTournament(id: string): Promise<Tournament | null> {
	const [tournament, matches] = await Promise.all([
		apiGet<TournamentDto>(`/api/tournaments/${id}`).catch(() => null),
		listMatches(id).catch(() => []),
	]);
	return tournament ? toTournament(tournament, matches) : null;
}

export interface CreateTournamentInput {
	name: string;
	description: string;
	registrationType: TournamentRegistrationKind;
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

function tournamentRequestBody(input: CreateTournamentInput) {
	return {
		name: input.name,
		description: input.description,
		registrationStartDate: new Date(input.registrationStartDate).toISOString(),
		registrationEndDate: new Date(input.registrationEndDate).toISOString(),
		tournamentStartDate: new Date(input.tournamentStartDate).toISOString(),
		tournamentEndDate: new Date(input.tournamentEndDate).toISOString(),
		minCost: input.minCost,
		maxCost: input.maxCost,
		minCharacters: input.minCharacters,
		minTier: input.minTier,
		maxTier: input.maxTier,
		overrideEloChange: input.overrideEloChange,
		bracketType: input.bracketType,
		consolationMatchesTargetRank: input.consolationMatchesTargetRank,
		visible: input.visible,
		discordRoleName: input.discordRoleName,
		discordChannelName: input.discordChannelName,
	};
}

export async function createTournament(input: CreateTournamentInput): Promise<Tournament> {
	const dto = await apiPost<TournamentDto>('/api/tournaments', {
		...tournamentRequestBody(input),
		registrationType: input.registrationType,
	});
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

// ---- Registrations ----

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
		// Legacy naming-bug swap preserved on the wire (see LegacyMapper.cs): darteAccount is
		// actually the preset name, dartePreset is actually the roster name.
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

// ---- Matches ----

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

// ---- History ----

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

function historyPageQuery(cursor: HistoryCursor | null | undefined, take: number): string {
	const params = new URLSearchParams({ take: String(take) });
	if (cursor) {
		params.set('beforeTimestamp', new Date(cursor.timestamp).toISOString());
		params.set('beforeId', cursor.id);
	}
	return params.toString();
}

function toHistoryPage(dto: HistoryPageDto): HistoryPage {
	return { entries: dto.entries.map(toHistoryEntry), hasMore: dto.hasMore };
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

// ---- Seasons / archives ----

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

// "League ends at" countdown shown on the home page — purely informational, admin-set.
export async function getSeasonTimer(): Promise<number | null> {
	const dto = await apiGet<{ endTimestamp: string | null }>('/api/seasons/timer');
	return dto.endTimestamp ? epoch(dto.endTimestamp) : null;
}

export async function setSeasonTimer(endTimestamp: number): Promise<void> {
	await apiPut('/api/seasons/timer', { endTimestamp: new Date(endTimestamp).toISOString() });
}

// ---- Teams ----

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
