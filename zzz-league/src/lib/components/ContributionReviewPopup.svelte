<script lang="ts">
	import { mindscapeLabels } from "$lib/costData";
	import {
		addReview,
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
	}: {
		open?: boolean;
		contribution?: Contribution | null;
		agentName?: string;
		currentCosts?: number[];
	} = $props();

	let vote = $state<ReviewVote>("positive");
	let comment = $state("");

	$effect(() => {
		if (open) {
			vote = "positive";
			comment = "";
		}
	});

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

			<div class="diff-grid">
				<div></div>
				{#each mindscapeLabels as m (m)}
					<div class="diff-label">{m}</div>
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
						<div class="review-item">
							<span class="review-vote vote-{r.vote}">{voteLabels[r.vote]}</span>
							<span class="review-author">{r.reviewerName}</span>
							{#if r.comment}<span class="review-comment">{r.comment}</span>{/if}
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
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		background: #222;
		border-radius: 6px;
		padding: 8px 10px;
		font-size: 13px;
	}

	.review-vote {
		font-weight: 600;
		white-space: nowrap;
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
	}

	.review-comment {
		color: #ccc;
		flex-basis: 100%;
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
