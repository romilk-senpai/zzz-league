import { get, writable } from "svelte/store";

export type ReviewVote = "positive" | "neutral" | "negative";

export interface ContributionReview {
	id: string;
	reviewerName: string;
	vote: ReviewVote;
	comment: string;
	createdAt: string;
}

export type ContributionStatus = "pending" | "approved" | "rejected";

export interface Contribution {
	id: string;
	agentId: string;
	authorName: string;
	message: string;
	proposedCosts: number[];
	status: ContributionStatus;
	createdAt: string;
	reviews: ContributionReview[];
}

let nextId = 1000;
function makeId(prefix: string): string {
	nextId += 1;
	return `${prefix}-${nextId}`;
}

function review(reviewerName: string, vote: ReviewVote, comment: string): ContributionReview {
	return { id: makeId("review"), reviewerName, vote, comment, createdAt: new Date().toISOString() };
}

// Demo data only — covers every visual state the review flow can be in:
// no proposal, fresh (no reviews), partial positive, full positive, mixed,
// mostly negative, already approved, already rejected.
const initialContributions: Contribution[] = [
	{
		id: "c-soldier-0-anby",
		agentId: "soldier-0-anby",
		authorName: "Kirito_ZZZ",
		message: "M2 стоит поднять — слишком силён в текущем костинге для дуо-команд.",
		proposedCosts: [270, 375, 560, 725, 9999, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-08T10:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Согласен, M2 явно занижен."),
			review("MoonlitRaven", "positive", "Подтверждаю по опыту турниров."),
			review("Zaibatsu_Fan", "positive", "+1, играл против — реально сильно."),
			review("TVShowHost", "positive", "Да, стоит поднять."),
			review("Nightcrawler88", "positive", "Полностью за."),
		],
	},
	{
		id: "c-pyrois",
		agentId: "pyrois",
		authorName: "EmberWatcher",
		message: "M1 стоит немного снизить, разница с M0 слишком большая.",
		proposedCosts: [265, 340, 510, 710, 9999, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-09T14:20:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Разумно."),
			review("Zaibatsu_Fan", "positive", "Согласен."),
		],
	},
	{
		id: "c-hugo-vlad",
		agentId: "hugo-vlad",
		authorName: "IronMaiden_",
		message: "Стоимость сильно занижена относительно его реального перформанса на M0.",
		proposedCosts: [220, 230, 295, 380, 485, 620, 795],
		status: "pending",
		createdAt: "2026-09-11T09:05:00.000Z",
		reviews: [],
	},
	{
		id: "c-nekomiya-mana",
		agentId: "nekomiya-mana",
		authorName: "ShiroNeko",
		message: "Слишком дёшево на поздних мс, предлагаю поднять M4.",
		proposedCosts: [100, 135, 180, 240, 400, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-07T18:40:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Есть смысл."),
			review("Nightcrawler88", "positive", "Да, поддерживаю."),
			review("TVShowHost", "positive", "Согласен с ростом M4."),
			review("MoonlitRaven", "negative", "Не согласен, M4 и так редко берут."),
			review("Zaibatsu_Fan", "negative", "Слишком дорого будет."),
		],
	},
	{
		id: "c-seed",
		agentId: "seed",
		authorName: "DustyRoad",
		message: "M0 занижен, предлагаю немного поднять базовую стоимость.",
		proposedCosts: [80, 80, 100, 130, 160, 200, 255],
		status: "pending",
		createdAt: "2026-09-10T11:15:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Согласен."),
			review("Zaibatsu_Fan", "negative", "Не думаю, всё ок."),
			review("MoonlitRaven", "negative", "Не согласен."),
			review("TVShowHost", "negative", "M0 и так справедлив."),
		],
	},
	{
		id: "c-corin-wickes",
		agentId: "corin-wickes",
		authorName: "SilverRook",
		message: "Мелкая коррекция M0-M1.",
		proposedCosts: [60, 70, 80, 100, 120, 150, 185],
		status: "pending",
		createdAt: "2026-09-09T08:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Норм."),
			review("Zaibatsu_Fan", "positive", "Согласен."),
			review("MoonlitRaven", "positive", "+1."),
			review("Nightcrawler88", "neutral", "Не принципиально, но пусть будет."),
		],
	},
	{
		id: "c-asaba-harumasa",
		agentId: "asaba-harumasa",
		authorName: "Kirito_ZZZ",
		message: "M3 нужно поднять по итогам турнира лиги.",
		proposedCosts: [260, 360, 495, 760, 9999, 9999, 9999],
		status: "approved",
		createdAt: "2026-09-01T12:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Согласен."),
			review("Zaibatsu_Fan", "positive", "Да, стоит."),
			review("MoonlitRaven", "positive", "Подтверждаю."),
		],
	},
	{
		id: "c-billy-kid",
		agentId: "billy-kid",
		authorName: "RandomChallenger",
		message: "Предлагаю сильно снизить стоимость на всех уровнях.",
		proposedCosts: [90, 130, 180, 250, 350, 500, 9999],
		status: "rejected",
		createdAt: "2026-08-30T16:30:00.000Z",
		reviews: [
			review("Hollow_Diver", "negative", "Слишком резкое снижение, не обосновано."),
			review("Zaibatsu_Fan", "negative", "Не согласен."),
		],
	},
	{
		id: "c-qingyi",
		agentId: "qingyi",
		authorName: "MoonlitRaven",
		message: "Стоимость на всех уровнях занижена относительно её пикрейта.",
		proposedCosts: [365, 520, 745, 1080, 1565, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-05T13:10:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Да."),
			review("Zaibatsu_Fan", "positive", "Согласен."),
			review("TVShowHost", "positive", "+1."),
			review("Nightcrawler88", "positive", "Подтверждаю."),
			review("SilverRook", "positive", "Да, давно пора."),
			review("IronMaiden_", "positive", "Согласен полностью."),
		],
	},
	{
		id: "c-hoshimi-miyabi",
		agentId: "hoshimi-miyabi",
		authorName: "FrostByte",
		message: "M2 нужно немного поднять.",
		proposedCosts: [320, 465, 720, 970, 1405, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-11T20:00:00.000Z",
		reviews: [],
	},
];

export const contributions = writable<Contribution[]>(initialContributions);

export function contributionsFor(agentId: string): Contribution[] {
	return get(contributions).filter((c) => c.agentId === agentId);
}

// 0 (red) -> 1 (green). No reviews at all is 0. Pure positive reviews need 5
// of them to reach 1. Any negative/neutral reviews dilute the ratio, so a
// single positive review mixed in with others stays far from green.
export function contributionScore(reviews: ContributionReview[]): number {
	if (reviews.length === 0) return 0;
	const positive = reviews.filter((r) => r.vote === "positive").length;
	const total = reviews.length;
	const ratio = positive / total;
	const progress = Math.min(positive, 5) / 5;
	return ratio * progress;
}

export function contributionColor(score: number): string {
	const from = { r: 0xdc, g: 0x39, b: 0x39 };
	const to = { r: 0x2e, g: 0xa3, b: 0x4b };
	const r = Math.round(from.r + (to.r - from.r) * score);
	const g = Math.round(from.g + (to.g - from.g) * score);
	const b = Math.round(from.b + (to.b - from.b) * score);
	return `rgb(${r}, ${g}, ${b})`;
}

export function addReview(contributionId: string, vote: ReviewVote, comment: string, reviewerName: string): void {
	contributions.update((list) =>
		list.map((c) =>
			c.id === contributionId
				? { ...c, reviews: [...c.reviews, review(reviewerName, vote, comment)] }
				: c,
		),
	);
}

export function setStatus(contributionId: string, status: ContributionStatus): void {
	contributions.update((list) => list.map((c) => (c.id === contributionId ? { ...c, status } : c)));
}

export function createContribution(
	agentId: string,
	authorName: string,
	message: string,
	proposedCosts: number[],
): void {
	contributions.update((list) => [
		...list,
		{
			id: makeId("c"),
			agentId,
			authorName,
			message,
			proposedCosts,
			status: "pending",
			createdAt: new Date().toISOString(),
			reviews: [],
		},
	]);
}
