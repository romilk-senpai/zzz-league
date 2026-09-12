import { writable } from "svelte/store";

export type ReviewVote = "positive" | "neutral" | "negative";

export interface ReviewComment {
	id: string;
	authorName: string;
	text: string;
	createdAt: string;
}

export interface ContributionReview {
	id: string;
	reviewerName: string;
	vote: ReviewVote;
	comment: string;
	createdAt: string;
	comments: ReviewComment[];
}

export type ContributionStatus = "pending" | "approved" | "rejected";

export interface Contribution {
	id: string;
	/** Set for an agent (character) cost contribution. */
	agentId?: string;
	/** Set for a W-engine contribution — either its base cost (overrideAgentId unset) or a specific agent's override cost. */
	engineId?: string;
	overrideAgentId?: string;
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

function review(
	reviewerName: string,
	vote: ReviewVote,
	comment: string,
	comments: ReviewComment[] = [],
): ContributionReview {
	return { id: makeId("review"), reviewerName, vote, comment, createdAt: new Date().toISOString(), comments };
}

function reviewComment(authorName: string, text: string): ReviewComment {
	return { id: makeId("rc"), authorName, text, createdAt: new Date().toISOString() };
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
			review("Hollow_Diver", "positive", "Согласен, M2 явно занижен.", [
				reviewComment("Kirito_ZZZ", "На каких турнирах смотрел?"),
				reviewComment("Hollow_Diver", "На Shiyu Cup S3, финалы."),
			]),
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
			review("MoonlitRaven", "negative", "Не согласен, M4 и так редко берут.", [
				reviewComment("ShiroNeko", "На высоком уровне берут почти всегда."),
				reviewComment("MoonlitRaven", "На высоком — да, но это не средний случай."),
				reviewComment("TVShowHost", "Тут скорее вопрос баланса лиг, а не факта пикрейта."),
			]),
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

	// W-engine contributions — same states as above, just scoped to an engine
	// (base cost) or an engine+agent pair (per-agent override).
	{
		id: "c-engine-steel-cushion-base",
		engineId: "14102",
		authorName: "EmberWatcher",
		message: "R4-R5 растут слишком резко относительно R1-R3, стоит сгладить.",
		proposedCosts: [10, 12, 15, 16, 18, 0],
		status: "pending",
		createdAt: "2026-09-10T12:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Согласен, скачок на R4 странный."),
			review("Zaibatsu_Fan", "positive", "+1."),
		],
	},
	{
		id: "c-engine-tusks-of-fury-new-agent",
		engineId: "14107",
		overrideAgentId: "ben-bigger",
		authorName: "SilverRook",
		message: "У Бена тоже неплохая синергия с этим движком, предлагаю добавить отдельную стоимость.",
		proposedCosts: [15, 17, 9999, 9999, 9999],
		status: "pending",
		createdAt: "2026-09-12T09:30:00.000Z",
		reviews: [],
	},
	{
		id: "c-engine-weeping-cradle-base",
		engineId: "14121",
		authorName: "Kirito_ZZZ",
		message: "Базовая стоимость R1 занижена.",
		proposedCosts: [8, 7, 10, 12, 15, 5],
		status: "approved",
		createdAt: "2026-09-02T10:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "positive", "Согласен."),
			review("MoonlitRaven", "positive", "Да, справедливо."),
		],
	},
	{
		id: "c-engine-blazing-laurel-qingyi",
		engineId: "14116",
		overrideAgentId: "qingyi",
		authorName: "RandomChallenger",
		message: "Предлагаю снизить стоимость для Цинъи, синергия не настолько сильная.",
		proposedCosts: [10, 12, 9999, 9999, 9999],
		status: "rejected",
		createdAt: "2026-08-29T15:00:00.000Z",
		reviews: [
			review("Hollow_Diver", "negative", "Не согласен, синергия сильная."),
			review("Zaibatsu_Fan", "negative", "Отклонить."),
		],
	},
];

export const contributions = writable<Contribution[]>(initialContributions);

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

export function addReviewComment(
	contributionId: string,
	reviewId: string,
	authorName: string,
	text: string,
): void {
	contributions.update((list) =>
		list.map((c) =>
			c.id !== contributionId
				? c
				: {
						...c,
						reviews: c.reviews.map((r) =>
							r.id === reviewId
								? { ...r, comments: [...r.comments, reviewComment(authorName, text)] }
								: r,
						),
					},
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

export function createEngineContribution(
	engineId: string,
	overrideAgentId: string | undefined,
	authorName: string,
	message: string,
	proposedCosts: number[],
): void {
	contributions.update((list) => [
		...list,
		{
			id: makeId("c"),
			engineId,
			overrideAgentId,
			authorName,
			message,
			proposedCosts,
			status: "pending",
			createdAt: new Date().toISOString(),
			reviews: [],
		},
	]);
}
