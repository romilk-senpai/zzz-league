<script lang="ts">
	import { mindscapeLabels } from "$lib/costData";
	import {
		addReview,
		addReviewComment,
		contributionColor,
		contributionScore,
		setStatus,
		type Contribution,
		type ReviewVote,
	} from "$lib/mockContributions";
	import { currentUser, isAdmin, isModerator } from "$lib/store";

	let {
		open = $bindable(false),
		contribution = null as Contribution | null,
		agentName = "",
		currentCosts = [] as number[],
		rankLabels = mindscapeLabels,
	}: {
		open?: boolean;
		contribution?: Contribution | null;
		agentName?: string;
		currentCosts?: number[];
		rankLabels?: string[];
	} = $props();

	let vote = $state<ReviewVote>("positive");
	let comment = $state("");
	let expandedComments = $state<Set<string>>(new Set());
	let expandedDiscussions = $state<Set<string>>(new Set());
	let discussionDrafts = $state<Record<string, string>>({});

	$effect(() => {
		if (open) {
			vote = "positive";
			comment = "";
			expandedComments = new Set();
			expandedDiscussions = new Set();
			discussionDrafts = {};
		}
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

	function submitDiscussionComment(reviewId: string) {
		if (!contribution) return;
		const text = (discussionDrafts[reviewId] ?? "").trim();
		if (!text) return;
		const authorName = $currentUser?.name ?? "Вы";
		addReviewComment(contribution.id, reviewId, authorName, text);
		discussionDrafts[reviewId] = "";
	}

	let canModerate = $derived($isAdmin || $isModerator);

	const voteLabels: Record<ReviewVote, string> = {
		positive: "👍 Плюс",
		neutral: "😐 Нейтрально",
		negative: "👎 Минус",
	};

	const statusLabels: Record<Contribution["status"], string> = {
		pending: "На рассмотрении",
		approved: "Принято",
		rejected: "Отклонено",
	};

	function submitReview() {
		if (!contribution) return;
		const reviewerName = $currentUser?.name ?? "Вы";
		addReview(contribution.id, vote, comment.trim(), reviewerName);
		comment = "";
	}

	function approve() {
		if (contribution) setStatus(contribution.id, "approved");
	}

	function reject() {
		if (contribution) setStatus(contribution.id, "rejected");
	}
</script>

{#if open && contribution}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card review-card" onclick={(e) => e.stopPropagation()}>
			<h2>{agentName} — предложение от {contribution.authorName}</h2>

			<div class="status-row">
				<span class="status-badge status-{contribution.status}">{statusLabels[contribution.status]}</span>
				{#if contribution.status === "pending"}
					<span
						class="score-dot"
						style="background:{contributionColor(contributionScore(contribution.reviews))}"
						title="Прогресс к одобрению сообществом"
					></span>
				{/if}
			</div>

			<p class="contribution-message">{contribution.message}</p>

			<div class="diff-grid" style="grid-template-columns: 90px repeat({rankLabels.length}, 1fr);">
				<div></div>
				{#each rankLabels as m, i (i)}
					<div class="diff-label">{m || `#${i + 1}`}</div>
				{/each}
				<div class="diff-row-label">Сейчас</div>
				{#each currentCosts as v, i (i)}
					<div class="diff-cell">{v}</div>
				{/each}
				<div class="diff-row-label">Предложено</div>
				{#each contribution.proposedCosts as v, i (i)}
					<div class="diff-cell" class:changed={v !== currentCosts[i]}>{v}</div>
				{/each}
			</div>

			<h3>Отзывы ({contribution.reviews.length})</h3>
			{#if contribution.reviews.length === 0}
				<p class="notice">Пока никто не оставил отзыв.</p>
			{:else}
				<div class="review-list">
					{#each contribution.reviews as r (r.id)}
						{@const commentExpanded = expandedComments.has(r.id)}
						{@const discussionExpanded = expandedDiscussions.has(r.id)}
						<div class="review-item">
							<div class="review-header">
								<span class="review-vote vote-{r.vote}">{voteLabels[r.vote]}</span>
								<span class="review-author">{r.reviewerName}</span>
								{#if r.comment}
									<button
										type="button"
										class="review-comment-line"
										class:expanded={commentExpanded}
										onclick={() => toggleComment(r.id)}
									>
										{r.comment}
									</button>
								{/if}
							</div>

							<button
								type="button"
								class="discussion-toggle"
								onclick={() => toggleDiscussion(r.id)}
							>
								💬 {r.comments.length ? `Обсуждение (${r.comments.length})` : "Обсудить"}
								<span class="discussion-caret" class:expanded={discussionExpanded}>▸</span>
							</button>

							{#if discussionExpanded}
								<div class="discussion">
									{#if r.comments.length === 0}
										<p class="notice discussion-empty">Пока нет комментариев.</p>
									{:else}
										<div class="discussion-list">
											{#each r.comments as rc (rc.id)}
												<div class="discussion-comment">
													<span class="discussion-author">{rc.authorName}</span>
													<span class="discussion-text">{rc.text}</span>
												</div>
											{/each}
										</div>
									{/if}
									<div class="discussion-add">
										<input
											placeholder="Написать комментарий..."
											value={discussionDrafts[r.id] ?? ""}
											oninput={(e) => (discussionDrafts[r.id] = e.currentTarget.value)}
										/>
										<button type="button" onclick={() => submitDiscussionComment(r.id)}
											>Отправить</button
										>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

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
				<textarea rows="2" placeholder="Комментарий к отзыву" bind:value={comment}></textarea>
				<button class="btn-common" onclick={submitReview}>Добавить отзыв</button>
			</div>

			{#if canModerate}
				<div class="btn-row">
					<button class="btn-common btn-play" onclick={approve}>Принять</button>
					<button class="btn-common btn-reject" onclick={reject}>Отклонить</button>
				</div>
			{/if}

			<div class="btn-row">
				<button class="btn-common" onclick={() => (open = false)}>Закрыть</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.review-card {
		width: 560px;
		max-width: 90vw;
		max-height: 65vh;
		overflow-y: auto;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.status-badge {
		font-size: 12px;
		font-weight: bold;
		padding: 4px 10px;
		border-radius: 4px;
	}

	.status-pending {
		background: rgba(255, 204, 0, 0.12);
		color: var(--gold);
	}

	.status-approved {
		background: rgba(46, 163, 75, 0.15);
		color: var(--green);
	}

	.status-rejected {
		background: rgba(220, 57, 57, 0.15);
		color: var(--loss);
	}

	.score-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.contribution-message {
		color: #ccc;
	}

	.diff-grid {
		display: grid;
		grid-template-columns: 90px repeat(7, 1fr);
		gap: 6px;
		align-items: center;
	}

	.diff-label {
		text-align: center;
		font-size: 11px;
		color: #888;
	}

	.diff-row-label {
		font-size: 12px;
		color: #888;
	}

	.diff-cell {
		text-align: center;
		padding: 6px 2px;
		border-radius: 4px;
		background: #222;
		font-size: 13px;
	}

	.diff-cell.changed {
		background: rgba(255, 204, 0, 0.15);
		color: var(--gold);
		font-weight: bold;
	}

	.review-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.review-item {
		background: #222;
		border-radius: 6px;
		font-size: 13px;
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.review-header {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.review-vote {
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.vote-positive {
		color: var(--green);
	}

	.vote-negative {
		color: var(--loss);
	}

	.vote-neutral {
		color: #aaa;
	}

	.review-author {
		color: #aaa;
		flex-shrink: 0;
	}

	.review-comment-line {
		all: unset;
		box-sizing: border-box;
		cursor: pointer;
		color: #ccc;
		flex: 1 1 120px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.review-comment-line.expanded {
		white-space: normal;
		flex-basis: 100%;
	}

	.discussion-toggle {
		all: unset;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		cursor: pointer;
		color: #888;
		font-size: 11px;
	}

	.discussion-toggle:hover {
		color: #ccc;
	}

	.discussion-caret {
		transition: transform 0.15s;
	}

	.discussion-caret.expanded {
		transform: rotate(90deg);
	}

	.discussion {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		background: #1a1a1a;
		border-radius: 6px;
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
		flex-wrap: wrap;
		gap: 6px;
		font-size: 12px;
	}

	.discussion-author {
		color: #aaa;
		font-weight: 600;
		flex-shrink: 0;
	}

	.discussion-text {
		color: #ccc;
	}

	.discussion-add {
		display: flex;
		gap: 6px;
	}

	.discussion-add input {
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
		font-size: 12px;
	}

	.discussion-add button {
		all: unset;
		box-sizing: border-box;
		cursor: pointer;
		padding: 6px 10px;
		background: #333;
		border-radius: 6px;
		font-size: 12px;
		white-space: nowrap;
	}

	.discussion-add button:hover {
		background: #444;
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
		background: #222;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 8px;
		font-size: 18px;
		cursor: pointer;
	}

	.vote-choice button.selected {
		border-color: var(--gold);
		background: rgba(255, 204, 0, 0.1);
	}

	.btn-reject {
		background: #441111;
		color: #ff4444;
		border-color: #662222;
	}
</style>
