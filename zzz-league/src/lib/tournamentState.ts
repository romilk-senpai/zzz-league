export const TOURNAMENT_STATE = {
	REGISTRATION: "registration",
	REGISTRATION_CLOSED: "registration_closed",
	BRACKET_CREATED: "bracket_created",
	STARTED: "started",
	AWAITING_REVIEW: "awaiting_review",
	COMPLETE: "complete",
} as const;

export function isRegistrationOpen(state: string | undefined): boolean {
	return !state || state === TOURNAMENT_STATE.REGISTRATION;
}

export function isRegistrationWindowOpen(
	state: string | undefined,
	registrationStartDate: number,
	registrationEndDate: number,
	now: number,
): boolean {
	return (
		isRegistrationOpen(state) &&
		now > registrationStartDate &&
		now < registrationEndDate
	);
}

export function isRegistrationClosed(state: string | undefined): boolean {
	return state === TOURNAMENT_STATE.REGISTRATION_CLOSED;
}

export function isBracketCreated(state: string | undefined): boolean {
	return state === TOURNAMENT_STATE.BRACKET_CREATED;
}

export function hasTournamentStarted(state: string | undefined): boolean {
	return (
		state === TOURNAMENT_STATE.STARTED ||
		state === TOURNAMENT_STATE.AWAITING_REVIEW ||
		state === TOURNAMENT_STATE.COMPLETE
	);
}

export function isLocked(state: string | undefined): boolean {
	return isBracketCreated(state) || hasTournamentStarted(state);
}
