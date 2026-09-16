<script lang="ts">
	import type { ReviewVote } from "$lib/api/dtos";
	import { mindscapeLabels } from "$lib/costData";
	import {
		approveContribution,
		contributionColor,
		getContribution,
		rejectContribution,
		submitReview as apiSubmitReview,
		submitReviewComment,
		type ContributionDetail,
	} from "$lib/contributions";
	import { currentUser, isAdmin, isModerator } from "$lib/store";
	import { _ } from "$lib/i18n";

	let {
		open = $bindable(false),
		contributionId = null as string | null,
		agentName = "",
		currentCosts = [] as number[],
		rankLabels = mindscapeLabels,
	}: {
		open?: boolean;
		contributionId?: string | null;
		agentName?: string;
		currentCosts?: number[];
		rankLabels?: string[];
	} = $props();

	let contribution = $state<ContributionDetail | null>(null);
	let vote = $state<ReviewVote>("positive");
	let comment = $state("");
	let submittingReview = $state(false);
	let resolving = $state(false);
	let errorMessage = $state("");
	let expandedComments = $state<Set<string>>(new Set());
	let expandedDiscussions = $state<Set<string>>(new Set());
	let discussionDrafts = $state<Record<string, string>>({});
	let showReviewForm = $state(false);

	// Best-effort "is this my review" match for the pre-fill/edit UX below — ReviewDto only
	// carries a display name, not a stable reviewer id, but this is cosmetic: the server always
	// resolves the real reviewer from the caller's own JWT on submit regardless of what's shown.
	const myReview = $derived(contribution?.reviews.find((r) => r.reviewerName === $currentUser?.name) ?? null);

	$effect(() => {
		if (!open || !contributionId) return;
		contribution = null;
		errorMessage = "";
		expandedComments = new Set();
		expandedDiscussions = new Set();
		discussionDrafts = {};
		showReviewForm = false;
		const id = contributionId;
		getContribution(id).then((detail) => {
			if (id !== contributionId) return; // stale response from a since-changed selection
			contribution = detail;
			const mine = detail?.reviews.find((r) => r.reviewerName === $currentUser?.name) ?? null;
			vote = mine?.vote ?? "positive";
			comment = mine?.comment ?? "";
			showReviewForm = !!mine;
		});
	});

	function toggleComment(id: string) {
		const next = new Set(expandedComments);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedComments = next;
	}

	function toggleDiscussion(id: string) {
		const next = new Set(expandedDiscussions);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedDiscussions = next;
	}

	async function submitDiscussionComment(reviewId: string) {
		if (!contribution) return;
		const text = (discussionDrafts[reviewId] ?? "").trim();
		if (!text) return;
		discussionDrafts[reviewId] = "";
		try {
			contribution = await submitReviewComment(contribution.id, reviewId, text);
		} catch (error: any) {
			errorMessage = error.message;
		}
	}

	let canModerate = $derived($isAdmin || $isModerator);

	let voteLabels: Record<ReviewVote, string> = $derived({
		positive: `👍 ${$_("contributionReviewPopup.vote.positive")}`,
		neutral: `😐 ${$_("contributionReviewPopup.vote.neutral")}`,
		negative: `👎 ${$_("contributionReviewPopup.vote.negative")}`,
	});

	let statusLabels: Record<ContributionDetail["status"], string> = $derived({
		pending: $_("contributionReviewPopup.status.pending"),
		approved: $_("contributionReviewPopup.status.approved"),
		rejected: $_("contributionReviewPopup.status.rejected"),
	});

	// Purely presentational restatement of the same 0..1 score contributionColor renders as a
	// dot — gives the color meaning in words instead of just a gradient hue.
	function scoreProximityLabel(score: number): string {
		if (score >= 0.66) return $_("contributionReviewPopup.scoreProximity.close");
		if (score <= 0.33) return $_("contributionReviewPopup.scoreProximity.far");
		return $_("contributionReviewPopup.scoreProximity.mixed");
	}

	async function submitReview() {
		if (!contribution || submittingReview) return;
		submittingReview = true;
		errorMessage = "";
		try {
			contribution = await apiSubmitReview(contribution.id, vote, comment.trim());
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			submittingReview = false;
		}
	}

	async function approve() {
		if (!contribution || resolving) return;
		resolving = true;
		errorMessage = "";
		try {
			contribution = await approveContribution(contribution.id);
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			resolving = false;
		}
	}

	async function reject() {
		if (!contribution || resolving) return;
		resolving = true;
		errorMessage = "";
		try {
			contribution = await rejectContribution(contribution.id);
		} catch (error: any) {
			errorMessage = error.message;
		} finally {
			resolving = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card review-card" onclick={(e) => e.stopPropagation()}>
			{#if !contribution}
				<p class="notice">{$_("common.loading")}</p>
			{:else}
			<div class="header-row">
				<h2 class="popup-title">{$_("contributionReviewPopup.popupTitle", { values: { agent: agentName, author: contribution.authorName } })}</h2>
				<button class="icon-btn close-btn" onclick={() => (open = false)} aria-label={$_("common.close")}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<div class="status-row">
				<span class="tag status-{contribution.status}">{statusLabels[contribution.status]}</span>
				{#if contribution.status === "pending"}
					<span
						class="score-dot"
						style="background:{contributionColor(contribution.score)}"
						title={$_("contributionReviewPopup.approvalProgressTooltip")}
					></span>
					<span class="score-label">{scoreProximityLabel(contribution.score)}</span>
				{/if}
			</div>

			<p class="contribution-message">{contribution.message}</p>

			<div class="section-block">
				<div class="section-title">{$_("contributionReviewPopup.costChangeTitle")}</div>
				<div class="diff-scroll">
					<div class="diff-grid" style="grid-template-columns: 78px repeat({rankLabels.length}, minmax(44px, 1fr));">
						<div></div>
						{#each rankLabels as m, i (i)}
							<div class="diff-label">{m || `#${i + 1}`}</div>
						{/each}
						<div class="diff-row-label">{$_("contributionReviewPopup.currentRow")}</div>
						{#each currentCosts as v, i (i)}
							<div class="diff-cell">{v}</div>
						{/each}
						<div class="diff-row-label">{$_("contributionReviewPopup.proposedRow")}</div>
						{#each contribution.proposedCosts as v, i (i)}
							<div class="diff-cell" class:changed={v !== currentCosts[i]}>{v}</div>
						{/each}
					</div>
				</div>
			</div>

			<h3>{$_("contributionReviewPopup.reviewsHeading", { values: { count: contribution.reviews.length } })}</h3>
			{#if contribution.reviews.length === 0}
				<p class="notice">{$_("contributionReviewPopup.noReviewsYet")}</p>
			{:else}
				<div class="review-list">
					{#each contribution.reviews as r (r.id)}
						{@const commentExpanded = expandedComments.has(r.id)}
						{@const discussionExpanded = expandedDiscussions.has(r.id)}
						<div class="review-item">
							<div class="review-header">
								<span class="review-vote vote-{r.vote}">{voteLabels[r.vote]}</span>
								<span class="review-author">{r.reviewerName}</span>
							</div>

							{#if r.comment}
								<button
									type="button"
									class="review-comment-toggle"
									class:expanded={commentExpanded}
									title={$_("contributionReviewPopup.showFullTooltip")}
									onclick={() => toggleComment(r.id)}
								>
									<span class="review-comment">{r.comment}</span>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
								</button>
							{/if}

							<button type="button" class="discussion-toggle" onclick={() => toggleDiscussion(r.id)}>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
								{r.comments.length
									? $_("contributionReviewPopup.discussionWithCount", { values: { count: r.comments.length } })
									: $_("contributionReviewPopup.discussionStart")}
							</button>

							{#if discussionExpanded}
								<div class="discussion">
									{#if r.comments.length === 0}
										<p class="notice discussion-empty">{$_("contributionReviewPopup.noCommentsYet")}</p>
									{:else}
										<div class="discussion-list">
											{#each r.comments as rc (rc.id)}
												<div class="discussion-comment">
													<span class="discussion-author">{rc.authorName}:</span>
													<span class="discussion-text">{rc.text}</span>
												</div>
											{/each}
										</div>
									{/if}
									<div class="discussion-add">
										<input
											placeholder={$_("contributionReviewPopup.commentPlaceholder")}
											value={discussionDrafts[r.id] ?? ""}
											oninput={(e) => (discussionDrafts[r.id] = e.currentTarget.value)}
										/>
										{#if $currentUser}
											<button type="button" class="btn-common" onclick={() => submitDiscussionComment(r.id)}
												>{$_("contributionReviewPopup.send")}</button
											>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<div class="divider"></div>

			{#if $currentUser}
				{#if showReviewForm}
					<div class="add-review">
						<div class="vote-choice">
							<button type="button" class:selected={vote === "positive"} onclick={() => (vote = "positive")}
								>👍</button
							>
							<button type="button" class:selected={vote === "neutral"} onclick={() => (vote = "neutral")}
								>😐</button
							>
							<button type="button" class:selected={vote === "negative"} onclick={() => (vote = "negative")}
								>👎</button
							>
						</div>
						<textarea rows="2" placeholder={$_("contributionReviewPopup.reviewCommentPlaceholder")} bind:value={comment}></textarea>
						{#if errorMessage}
							<p class="notice error">{errorMessage}</p>
						{/if}
						<button class="btn-common" onclick={submitReview} disabled={submittingReview}>
							{submittingReview
								? $_("contributionReviewPopup.submitting")
								: myReview
									? $_("contributionReviewPopup.updateReview")
									: $_("contributionReviewPopup.addReview")}
						</button>
					</div>
				{:else}
					<button type="button" class="btn-common btn-block" onclick={() => (showReviewForm = true)}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
						{$_("contributionReviewPopup.leaveReview")}
					</button>
				{/if}
			{:else}
				<p class="notice">{$_("contributionReviewPopup.loginToReview")}</p>
			{/if}

			{#if canModerate && contribution.status === "pending"}
				<div class="divider"></div>
				<div class="moderation-block">
					<div class="section-title moderation-title">{$_("contributionReviewPopup.moderationTitle")}</div>
					<div class="btn-row">
						<button class="btn-common btn-play" onclick={approve} disabled={resolving}>{$_("contributionReviewPopup.approve")}</button>
						<button class="btn-common btn-danger-ghost" onclick={reject} disabled={resolving}>{$_("contributionReviewPopup.reject")}</button>
					</div>
				</div>
			{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.review-card {
		width: 560px;
		max-width: 90vw;
		max-height: 80vh;
		padding: 20px 26px 26px;
		gap: 18px;
		overflow-y: auto;
	}

	.header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.popup-title {
		font-size: 16px;
		font-weight: 800;
		line-height: 1.35;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.close-btn {
		margin-top: -4px;
		margin-right: -6px;
		flex-shrink: 0;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.tag {
		padding: 3px 9px;
		border-radius: var(--r-sm);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.tag.status-pending {
		background: var(--gold-dim);
		color: var(--gold);
	}

	.tag.status-approved {
		background: var(--success-dim);
		color: var(--success);
	}

	.tag.status-rejected {
		background: var(--danger-dim);
		color: var(--danger);
	}

	.score-dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.score-label {
		font-size: 11px;
		color: var(--text-dim);
	}

	.contribution-message {
		margin: 0;
		padding: 10px 12px;
		border-left: 3px solid var(--gold-border);
		background: var(--surface-2);
		border-radius: 0 var(--r-sm) var(--r-sm) 0;
		font-size: 12px;
		color: var(--text);
		line-height: 1.5;
	}

	.notice.error {
		color: var(--danger);
	}

	.section-block {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
	}

	.section-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-dim);
	}

	.diff-scroll {
		overflow-x: auto;
	}

	.diff-grid {
		display: grid;
		gap: 6px;
		align-items: center;
		min-width: 480px;
	}

	.diff-label {
		text-align: center;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-dim);
	}

	.diff-row-label {
		font-size: 11px;
		color: var(--text-dim);
		white-space: nowrap;
	}

	.diff-cell {
		text-align: center;
		padding: 7px 2px;
		border-radius: 6px;
		background: var(--surface);
		font-size: 12px;
		font-weight: 600;
	}

	.diff-cell.changed {
		background: var(--gold-dim);
		color: var(--gold);
		font-weight: 800;
	}

	.review-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.review-item {
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		font-size: 14px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.review-header {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.review-vote {
		font-weight: 700;
		font-size: 12px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.vote-positive {
		color: var(--success);
	}

	.vote-negative {
		color: var(--danger);
	}

	.vote-neutral {
		color: var(--text-muted);
	}

	.review-author {
		color: var(--text-dim);
		font-size: 12px;
		flex-shrink: 0;
	}

	.review-comment-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
	}

	.review-comment-toggle svg {
		flex-shrink: 0;
		color: var(--text-dim);
		transition: transform 0.15s ease;
	}

	.review-comment-toggle.expanded svg {
		transform: rotate(180deg);
	}

	.review-comment-toggle:hover .review-comment {
		color: var(--gold-strong);
	}

	.review-comment-toggle:hover svg {
		color: var(--text-muted);
	}

	.review-comment {
		font-size: 12px;
		color: var(--text);
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
	}

	.review-comment-toggle.expanded .review-comment {
		white-space: normal;
	}

	.discussion-toggle {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		align-self: flex-start;
		font-size: 11px;
		color: var(--text-dim);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
	}

	.discussion-toggle:hover {
		color: var(--text-muted);
	}

	.discussion {
		display: flex;
		flex-direction: column;
		gap: 9px;
		padding: 11px;
		background: var(--bg-elevated);
		border-radius: var(--r-sm);
		border: 1px solid var(--border-soft);
	}

	.discussion-empty {
		margin: 0;
	}

	.discussion-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 160px;
		overflow-y: auto;
	}

	.discussion-comment {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-bottom: 9px;
		border-bottom: 1px solid var(--border-soft);
	}

	.discussion-comment:last-of-type {
		padding-bottom: 0;
		border-bottom: none;
	}

	.discussion-author {
		color: var(--text-dim);
		font-weight: 600;
		font-size: 11px;
	}

	.discussion-text {
		color: var(--text);
		font-size: 12px;
		line-height: 1.4;
	}

	.discussion-add {
		display: flex;
		gap: 6px;
	}

	.discussion-add input {
		flex: 1;
		min-width: 0;
		height: 32px;
		padding: 0 9px;
		font-size: 12px;
	}

	.discussion-add .btn-common {
		height: 32px;
		padding: 0 11px;
		font-size: 11px;
		width: auto;
		white-space: nowrap;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
	}

	.add-review {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.vote-choice {
		display: flex;
		gap: 8px;
	}

	.vote-choice button {
		flex: 1;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		padding: 8px;
		font-size: 18px;
		cursor: pointer;
	}

	.vote-choice button.selected {
		border-color: var(--gold);
		background: var(--gold-dim);
	}

	.btn-block {
		width: 100%;
	}

	.moderation-block {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		border-radius: var(--r-md);
		background: var(--danger-dim);
		border: 1px solid var(--danger-border);
	}

	.moderation-title {
		color: var(--danger);
	}
</style>
