export interface Player {
	uid: string,
	name: string,
	discordId: string,
	discord: string,
	elo: number,
	tournamentPoints: number,
	isMidConfirmed: boolean,
	isHighConfirmed: boolean
}

export interface MatchRecord {
	p1: string
	p2: string
	change: number
}

export type Archives = Record<string, Player[]>

export interface Tournament {
	id: string;
	name: string;
	description: string;
	registrationStartDate: number;
	registrationEndDate: number;
	tournamentStartDate: number;
	tournamentEndDate: number;
}