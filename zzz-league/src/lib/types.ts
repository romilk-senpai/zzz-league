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
	key: string,
	p1: string,
	p2: string,
	change: number
}

export type Archives = Record<string, Player[]>