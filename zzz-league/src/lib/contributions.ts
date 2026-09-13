import { writable } from "svelte/store";
import {
	addReviewComment as apiAddReviewComment,
	approveContribution as apiApproveContribution,
	createAgentContribution as apiCreateAgentContribution,
	createEngineContribution as apiCreateEngineContribution,
	getContribution,
	listContributions,
	rejectContribution as apiRejectContribution,
	upsertReview as apiUpsertReview,
	type ContributionDetail,
	type ContributionListItem,
} from "./api/communityCosts";
import type { ReviewVote } from "./api/dtos";

export type { ContributionDetail, ContributionListItem, ContributionReview, ReviewComment } from "./api/communityCosts";
export { getContribution };

export const contributions = writable<ContributionListItem[]>([]);

export async function refreshContributions(): Promise<void> {
	contributions.set(await listContributions());
}

// Detail responses carry everything a list item needs plus the full review list — drop the
// reviews, keep the count, and patch the row in place so callers don't need a full re-fetch of
// the list after every mutation.
function toListItem(d: ContributionDetail): ContributionListItem {
	const { reviews, ...rest } = d;
	return { ...rest, reviewCount: reviews.length };
}

function upsertListItem(detail: ContributionDetail): void {
	const item = toListItem(detail);
	contributions.update((list) => {
		const index = list.findIndex((c) => c.id === item.id);
		if (index === -1) return [...list, item];
		const next = [...list];
		next[index] = item;
		return next;
	});
}

// 0 (red) -> 1 (green). Purely presentational — the actual 0..1 value comes precomputed from the
// server (see ContributionListItem.score / ContributionDetail.score).
export function contributionColor(score: number): string {
	const from = { r: 0xdc, g: 0x39, b: 0x39 };
	const to = { r: 0x2e, g: 0xa3, b: 0x4b };
	const r = Math.round(from.r + (to.r - from.r) * score);
	const g = Math.round(from.g + (to.g - from.g) * score);
	const b = Math.round(from.b + (to.b - from.b) * score);
	return `rgb(${r}, ${g}, ${b})`;
}

export async function createContribution(agentId: string, message: string, proposedCosts: number[]): Promise<ContributionDetail> {
	const detail = await apiCreateAgentContribution(agentId, message, proposedCosts);
	upsertListItem(detail);
	return detail;
}

export async function createEngineContribution(
	engineId: string,
	overrideAgentId: string | undefined,
	message: string,
	proposedCosts: number[],
): Promise<ContributionDetail> {
	const detail = await apiCreateEngineContribution(engineId, overrideAgentId ?? null, message, proposedCosts);
	upsertListItem(detail);
	return detail;
}

export async function submitReview(contributionId: string, vote: ReviewVote, comment: string): Promise<ContributionDetail> {
	const detail = await apiUpsertReview(contributionId, vote, comment);
	upsertListItem(detail);
	return detail;
}

export async function submitReviewComment(contributionId: string, reviewId: string, text: string): Promise<ContributionDetail> {
	const detail = await apiAddReviewComment(contributionId, reviewId, text);
	upsertListItem(detail);
	return detail;
}

export async function approveContribution(id: string): Promise<ContributionDetail> {
	const detail = await apiApproveContribution(id);
	upsertListItem(detail);
	return detail;
}

export async function rejectContribution(id: string): Promise<ContributionDetail> {
	const detail = await apiRejectContribution(id);
	upsertListItem(detail);
	return detail;
}
