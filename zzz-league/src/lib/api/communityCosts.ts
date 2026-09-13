import { apiGet, apiPost, apiPut } from '../api';
import type { AgentCost } from '../costData';
import type { WeaponCost } from '../weaponData';
import {
	epoch,
	type AgentCostDto,
	type ContributionDetailDto,
	type ContributionListItemDto,
	type ContributionStatus,
	type EngineCostDto,
	type ReviewVote,
} from './dtos';

export type { ContributionStatus, ReviewVote } from './dtos';

export interface ReviewComment {
	id: string;
	authorName: string;
	text: string;
	createdAt: number;
}

export interface ContributionReview {
	id: string;
	reviewerName: string;
	vote: ReviewVote;
	comment: string;
	createdAt: number;
	updatedAt: number;
	comments: ReviewComment[];
}

// Lean shape for table rows / tab badges / log cards — score and reviewCount come precomputed
// from the server rather than requiring every contribution's full review list up front.
export interface ContributionListItem {
	id: string;
	agentId: string | null;
	engineId: string | null;
	overrideAgentId: string | null;
	authorName: string;
	message: string;
	proposedCosts: number[];
	status: ContributionStatus;
	createdAt: number;
	reviewCount: number;
	score: number;
}

export interface ContributionDetail {
	id: string;
	agentId: string | null;
	engineId: string | null;
	overrideAgentId: string | null;
	authorName: string;
	message: string;
	proposedCosts: number[];
	status: ContributionStatus;
	createdAt: number;
	score: number;
	reviews: ContributionReview[];
}

function toListItem(dto: ContributionListItemDto): ContributionListItem {
	return { ...dto, createdAt: epoch(dto.createdAt) };
}

function toDetail(dto: ContributionDetailDto): ContributionDetail {
	return {
		...dto,
		createdAt: epoch(dto.createdAt),
		reviews: dto.reviews.map((r) => ({
			...r,
			createdAt: epoch(r.createdAt),
			updatedAt: epoch(r.updatedAt),
			comments: r.comments.map((c) => ({ ...c, createdAt: epoch(c.createdAt) })),
		})),
	};
}

export async function listAgentCosts(): Promise<AgentCost[]> {
	return apiGet<AgentCostDto[]>('/api/community-costs/agents');
}

export async function listEngineCosts(): Promise<WeaponCost[]> {
	return (await apiGet<EngineCostDto[]>('/api/community-costs/engines')).map((dto) => ({
		engineId: dto.engineId,
		name: dto.name,
		specialty: dto.specialty,
		rarity: dto.rarity,
		baseCosts: dto.baseCosts,
		agentOverrides: dto.agentOverrides,
	}));
}

export async function listContributions(): Promise<ContributionListItem[]> {
	return (await apiGet<ContributionListItemDto[]>('/api/community-costs/contributions')).map(toListItem);
}

export async function getContribution(id: string): Promise<ContributionDetail | null> {
	try {
		return toDetail(await apiGet<ContributionDetailDto>(`/api/community-costs/contributions/${id}`));
	} catch {
		return null;
	}
}

export async function createAgentContribution(
	agentId: string,
	message: string,
	proposedCosts: number[],
): Promise<ContributionDetail> {
	return toDetail(
		await apiPost<ContributionDetailDto>('/api/community-costs/contributions/agent', { agentId, message, proposedCosts }),
	);
}

export async function createEngineContribution(
	engineId: string,
	overrideAgentId: string | null,
	message: string,
	proposedCosts: number[],
): Promise<ContributionDetail> {
	return toDetail(
		await apiPost<ContributionDetailDto>('/api/community-costs/contributions/engine', {
			engineId,
			overrideAgentId,
			message,
			proposedCosts,
		}),
	);
}

export async function upsertReview(contributionId: string, vote: ReviewVote, comment: string): Promise<ContributionDetail> {
	return toDetail(
		await apiPut<ContributionDetailDto>(`/api/community-costs/contributions/${contributionId}/review`, { vote, comment }),
	);
}

export async function addReviewComment(contributionId: string, reviewId: string, text: string): Promise<ContributionDetail> {
	return toDetail(
		await apiPost<ContributionDetailDto>(
			`/api/community-costs/contributions/${contributionId}/reviews/${reviewId}/comments`,
			{ text },
		),
	);
}

export async function approveContribution(id: string): Promise<ContributionDetail> {
	return toDetail(await apiPost<ContributionDetailDto>(`/api/community-costs/contributions/${id}/approve`));
}

export async function rejectContribution(id: string): Promise<ContributionDetail> {
	return toDetail(await apiPost<ContributionDetailDto>(`/api/community-costs/contributions/${id}/reject`));
}

export async function importAgentCostsCsv(csv: string): Promise<void> {
	await apiPost('/api/community-costs/agents/import', { csv });
}

export async function importEngineCostsCsv(csv: string): Promise<void> {
	await apiPost('/api/community-costs/engines/import', { csv });
}
