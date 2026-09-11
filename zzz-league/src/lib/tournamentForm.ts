export function toDateTimeLocal(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface TournamentFormInput {
	name: string;
	registrationStartDate: string;
	registrationEndDate: string;
	tournamentStartDate: string;
	tournamentEndDate: string;
	tournamentType: string;
	overrideEloEnabled: boolean;
	overrideEloValue: number;
}

export type TournamentFormParseResult =
	| { error: string }
	| { error: null; regStart: number; regEnd: number; tourStart: number; tourEnd: number };

// Shared by the create and edit tournament forms — same fields, same validation rules.
export function parseAndValidateTournamentForm(v: TournamentFormInput): TournamentFormParseResult {
	if (
		!v.name ||
		!v.registrationStartDate ||
		!v.registrationEndDate ||
		!v.tournamentStartDate ||
		!v.tournamentEndDate ||
		!v.tournamentType
	) {
		return { error: "Заполните все поля" };
	}

	const regStart = new Date(v.registrationStartDate).getTime();
	const regEnd = new Date(v.registrationEndDate).getTime();
	const tourStart = new Date(v.tournamentStartDate).getTime();
	const tourEnd = new Date(v.tournamentEndDate).getTime();

	if (regEnd <= regStart) {
		return { error: "Конец регистрации должен быть позже начала" };
	}
	if (tourStart <= regEnd) {
		return { error: "Турнир должен начаться после регистрации" };
	}
	if (tourEnd <= tourStart) {
		return { error: "Конец турнира должен быть позже начала" };
	}
	if (v.overrideEloEnabled && v.overrideEloValue <= 0) {
		return { error: "Фиксированное эло должно быть больше 0" };
	}

	return { error: null, regStart, regEnd, tourStart, tourEnd };
}
