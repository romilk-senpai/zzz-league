import type { RegistrationFormInput } from "./api/registrations";
import type { TournamentRegistration } from "./types";

export interface MemberRegistrationForm {
	gameUid: string;
	prizeUid: string;
	prizeAsMoney: boolean;
	darteNickname: string;
	darteAccount: string;
	dartePreset: string;
	existingRosterUrl: string;
	existingHoyolabUrl: string;
	rosterScreenshot: FileList | null;
	hoyolabScreenshot: FileList | null;
}

export function emptyMemberRegistrationForm(): MemberRegistrationForm {
	return {
		gameUid: "",
		prizeUid: "",
		prizeAsMoney: false,
		darteNickname: "",
		darteAccount: "",
		dartePreset: "",
		existingRosterUrl: "",
		existingHoyolabUrl: "",
		rosterScreenshot: null,
		hoyolabScreenshot: null,
	};
}

export function applyDetailsToMemberForm(
	form: MemberRegistrationForm,
	details: TournamentRegistration["player1"] | null,
) {
	if (!details) return;
	form.gameUid = details.gameUid ?? "";
	form.prizeUid = details.prizeUid ?? "";
	form.prizeAsMoney = details.prizeAsMoney ?? false;
	form.darteNickname = details.darteNickname ?? "";
	form.darteAccount = details.dartePresetName ?? "";
	form.dartePreset = details.rosterName ?? "";
	form.existingRosterUrl = details.rosterScreenshotUrl ?? "";
	form.existingHoyolabUrl = details.hoyolabScreenshotUrl ?? "";
}

export function isMemberRegistrationFormComplete(form: MemberRegistrationForm): boolean {
	const hasRoster = (form.rosterScreenshot && form.rosterScreenshot.length > 0) || !!form.existingRosterUrl;
	const hasHoyolab = (form.hoyolabScreenshot && form.hoyolabScreenshot.length > 0) || !!form.existingHoyolabUrl;
	return !!(
		form.gameUid &&
		(form.prizeAsMoney || form.prizeUid) &&
		form.darteNickname &&
		form.darteAccount &&
		form.dartePreset &&
		hasRoster &&
		hasHoyolab
	);
}

export function memberRegistrationFormToInput(form: MemberRegistrationForm): RegistrationFormInput {
	return {
		gameUid: form.gameUid,
		prizeUid: form.prizeUid,
		prizeAsMoney: form.prizeAsMoney,
		darteNickname: form.darteNickname,
		darteAccount: form.darteAccount,
		dartePreset: form.dartePreset,
		rosterScreenshot: form.rosterScreenshot?.[0] ?? null,
		hoyolabScreenshot: form.hoyolabScreenshot?.[0] ?? null,
	};
}

export function memberRegistrationScreenshotFiles(form: MemberRegistrationForm): File[] {
	return [form.rosterScreenshot?.[0], form.hoyolabScreenshot?.[0]].filter((f): f is File => !!f);
}
