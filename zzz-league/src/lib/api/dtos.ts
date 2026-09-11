// Raw API DTO shapes (camelCase JSON, ISO date strings, snake_case string enums) — the wire
// contract with ZenlessLeague.Api. Frontend domain types live in ../types; the per-domain files
// in this directory (players.ts, tournaments.ts, ...) convert between the two.
import type { PlayerRole, TournamentGameMode, TournamentRegistrationKind } from '../types';

export interface LastRegistrationCacheDto {
	gameUid: string;
	prizeAsMoney: boolean;
	prizeUid: string | null;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

export interface PlayerDto {
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

export interface PlayerListItemDto {
	uid: string;
	name: string;
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
}

export interface TournamentDto {
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
	gameMode: TournamentGameMode;
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

export interface TournamentMatchDto {
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

export interface PlayerRegistrationDetailsDto {
	gameUid: string;
	prizeAsMoney: boolean;
	prizeUid: string | null;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

export interface TournamentRegistrationDto {
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

export interface HistoryEntryDto {
	id: string;
	p1PlayerId: string;
	p1Change: number;
	p2PlayerId: string | null;
	p2Change: number | null;
	tournamentId: string | null;
	tournamentName: string | null;
	tournamentMatchId: string | null;
	kind: string;
	resultP1: string | null;
	resultP2: string | null;
	resultScreenshotUrl: string | null;
	timestamp: string;
}

export interface HistoryPageDto {
	entries: HistoryEntryDto[];
	hasMore: boolean;
}

export interface PlayerSummaryDto {
	uid: string;
	name: string;
	avatar: string | null;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

export interface TeamDto {
	id: string;
	name: string;
	photoUrl: string | null;
	creator: PlayerSummaryDto;
	player2: PlayerSummaryDto;
	createdAt: string;
}

export interface TeamPageDto {
	teams: TeamDto[];
	hasMore: boolean;
}

export interface ArchivedPlayerSnapshotDto {
	uid: string | null;
	name: string;
	elo: number;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

export interface ArchiveDto {
	id: string;
	seasonName: string;
	createdAt: string;
	players: ArchivedPlayerSnapshotDto[];
}

// ISO string -> epoch millis — the only date representation used anywhere past this boundary.
export const epoch = (iso: string) => Date.parse(iso);

export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
