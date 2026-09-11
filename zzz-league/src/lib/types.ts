// Mirrors ZenlessLeague.Api's DTOs (see zzz-league-server/src/ZenlessLeague.Api/Features/**/*Dtos.cs).
// Dates are converted from the API's ISO-8601 strings to epoch millis at the `backend.ts` boundary
// so the rest of the app (tournamentState.ts, sorting, countdowns) can keep doing plain number math
// exactly as it did against the old Firebase RTDB shape.

export type PlayerRole = "player" | "moderator" | "admin";

export interface LastRegistrationData {
	gameUid: string;
	prizeUid: string | null;
	prizeAsMoney: boolean;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

export interface Player {
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
	lastPlayedTournamentTimestamp?: number;
	lastRegistration?: LastRegistrationData;
	avatar?: string;
	role: PlayerRole;
}

// Lean shape returned by GET /api/players (optionally filtered by uids) — everything list-context
// views (leaderboard, pickers, tournament rosters, history rows, profile popups opened from any of
// those) actually render. Omits discordId/role/lastRegistration, which only ever matter for the
// logged-in user's own full Player (fetched separately via getPlayer/$currentUser).
export interface PlayerListItem {
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
	lastPlayedTournamentTimestamp?: number;
	avatar?: string;
}

// A lean snapshot kept in season archives (ArchivedPlayerSnapshotDto) — not a full Player, so
// components rendering archived data (Leaderboard) must tolerate the missing fields.
export interface ArchivedPlayerSnapshot {
	// Null for archives created before the snapshot carried a real FK back to the player, or if
	// that player was later deleted. Present for anything archived going forward.
	uid: string | null;
	name: string;
	elo: number;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

export interface Archive {
	id: string;
	seasonName: string;
	createdAt: number;
	players: ArchivedPlayerSnapshot[];
}

export type TournamentMatchState = string; // Challonge's own vocabulary, passed through verbatim.

export interface TournamentMatch {
	id: string;
	tournamentId: string;
	challongeMatchId: number;
	p1: string | null;
	p2: string | null;
	// Team-tournament equivalents of p1/p2 — set XOR with them, depending on the owning
	// Tournament's registrationType.
	p1TeamId: string | null;
	p2TeamId: string | null;
	state: TournamentMatchState;
	winnerId: string | null;
	winnerTeamId: string | null;
	resultScreenshot: string | null;
	resultP1: string | null;
	resultP2: string | null;
	p1ApprovedResult: boolean;
	p2ApprovedResult: boolean;
	techLossUid: string | null;
	techLossTeamId: string | null;
}

export type TournamentRegistrationKind = "solo" | "team";

export interface Tournament {
	id: string;
	name: string;
	description: string | null;
	registrationStartDate: number;
	registrationEndDate: number;
	tournamentStartDate: number;
	tournamentEndDate: number;
	minCost: number;
	maxCost: number;
	minCharacters: number;
	minTier: number;
	maxTier: number;
	state: string;
	registrationType: TournamentRegistrationKind;
	visible: boolean;
	type: string | null; // legacy field name for BracketType, kept to avoid a UI-wide rename
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

export interface PlayerRegistrationDetails {
	gameUid: string;
	prizeAsMoney: boolean;
	prizeUid: string | null;
	darteNickname: string;
	dartePresetName: string;
	rosterName: string;
	rosterScreenshotUrl: string | null;
	hoyolabScreenshotUrl: string | null;
}

export interface TournamentRegistration {
	id: string;
	tournamentId: string;
	type: TournamentRegistrationKind;
	playerId: string | null;
	teamId: string | null;
	player1: PlayerRegistrationDetails;
	player2: PlayerRegistrationDetails | null;
	approved: boolean;
	registrationTimestamp: number;
}

export interface RegisteredPlayer {
	player: PlayerListItem;
	registration: TournamentRegistration;
}

export type TournamentMatchKind = "none" | "custom" | "tech_loss" | "adjustment";

export interface HistoryEntry {
	id: string;
	p1PlayerId: string;
	p1Change: number;
	p2PlayerId: string | null;
	p2Change: number | null;
	tournamentId: string | null;
	tournamentName: string | null;
	tournamentMatchId: string | null;
	kind: TournamentMatchKind;
	resultP1: string | null;
	resultP2: string | null;
	resultScreenshotUrl: string | null;
	timestamp: number;
}

// Keyset pagination cursor — the (timestamp, id) of the last entry seen, matching the API's
// ListPageAsync/ListPageByPlayerAsync ordering (Timestamp desc, Id desc as tiebreaker).
export interface HistoryCursor {
	timestamp: number;
	id: string;
}

export interface HistoryPage {
	entries: HistoryEntry[];
	hasMore: boolean;
}

export interface PlayerSummary {
	uid: string;
	name: string;
	avatar: string | null;
	isMidConfirmed: boolean;
	isHighConfirmed: boolean;
}

export interface Team {
	id: string;
	name: string;
	photoUrl: string | null;
	creator: PlayerSummary;
	player2: PlayerSummary;
	createdAt: number;
}

// Keyset pagination cursor, matching the API's ListPageAsync ordering (CreatedAt desc, Id desc).
export interface TeamCursor {
	createdAt: number;
	id: string;
}

export interface TeamPage {
	teams: Team[];
	hasMore: boolean;
}
