<script lang="ts">
	import { resolve } from "$app/paths";
	import { deleteHistoryEntry, listHistoryByPlayerPage, listHistoryPage } from "$lib/backend";
	import { isAdmin, playersByUid } from "$lib/store";
	import type { HistoryCursor, HistoryEntry } from "$lib/types";
	import {
		dateDisplayOptions,
		openImagePopup,
		openProfilePopup,
	} from "$lib/uiCommon";

	let { viewerId = undefined }: { viewerId?: string } = $props();

	const PAGE_SIZE = 50;

	let entries = $state<HistoryEntry[]>([]);
	let cursor = $state<HistoryCursor | null>(null);
	let hasMore = $state(true);
	let loading = $state(true);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLDivElement | undefined>();

	const LEGACY_CUTOFF_TIMESTAMP = 1783017803637;

	const legacyDividerEntryId = $derived(
		entries.find((e) => e.timestamp <= LEGACY_CUTOFF_TIMESTAMP)?.id,
	);

	function getPlayerName(uid: string) {
		return $playersByUid.get(uid)?.name ?? uid;
	}

	function openPlayer(uid: string) {
		const player = $playersByUid.get(uid);
		if (player) openProfilePopup(player);
	}

	function formatDate(timestamp: number) {
		return new Date(timestamp).toLocaleString("ru-RU", dateDisplayOptions);
	}

	function changeClass(change: number) {
		if (change > 0) return "gain";
		if (change < 0) return "loss";
		return "neutral";
	}

	async function handleDelete(id: string) {
		if (
			!confirm("Удалить запись? ELO/очки и победы/поражения будут отменены.")
		)
			return;
		try {
			await deleteHistoryEntry(id);
		} catch (error) {
			alert(error);
		}
	}

	let generation = 0;

	function fetchPage(currentViewerId: string | undefined, pageCursor: HistoryCursor | null) {
		return currentViewerId
			? listHistoryByPlayerPage(currentViewerId, pageCursor, PAGE_SIZE)
			: listHistoryPage(pageCursor, PAGE_SIZE);
	}

	async function loadMore() {
		// `loading` guards against the IntersectionObserver firing its initial "already
		// intersecting" callback before the first page has even resolved (the sentinel renders
		// immediately since `hasMore` starts true) — without it, that fires a duplicate page-1
		// fetch racing the initial load.
		if (!hasMore || loadingMore || loading) return;
		const myGeneration = generation;
		loadingMore = true;
		try {
			const page = await fetchPage(viewerId, cursor);
			if (myGeneration !== generation) return;
			entries = [...entries, ...page.entries];
			hasMore = page.hasMore;
			cursor = page.entries.length
				? { timestamp: page.entries[page.entries.length - 1].timestamp, id: page.entries[page.entries.length - 1].id }
				: cursor;
		} finally {
			if (myGeneration === generation) loadingMore = false;
		}
	}

	$effect(() => {
		const currentViewerId = viewerId;
		generation++;
		const myGeneration = generation;
		loading = true;
		entries = [];
		cursor = null;
		hasMore = true;

		fetchPage(currentViewerId, null)
			.then((page) => {
				if (myGeneration !== generation) return;
				entries = page.entries;
				hasMore = page.hasMore;
				cursor = page.entries.length
					? { timestamp: page.entries[page.entries.length - 1].timestamp, id: page.entries[page.entries.length - 1].id }
					: null;
			})
			.finally(() => {
				if (myGeneration === generation) loading = false;
			});
	});

	$effect(() => {
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(observerEntries) => {
				if (observerEntries[0].isIntersecting) {
					loadMore();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

<div class="match-list">
	{#each entries as entry (entry.id)}
		{#if entry.id === legacyDividerEntryId}
			<div class="legacy-divider">Легаси история (возможны ошибки)</div>
		{/if}

		{@const isLeft = !viewerId || entry.p1PlayerId === viewerId}
		{@const left = isLeft ? entry.p1PlayerId : entry.p2PlayerId!}
		{@const right = isLeft ? entry.p2PlayerId : entry.p1PlayerId}
		{@const leftChange = isLeft ? entry.p1Change : entry.p2Change!}
		{@const rightChange = isLeft ? entry.p2Change : entry.p1Change}
		{@const leftResult = isLeft ? entry.resultP1 : entry.resultP2}
		{@const rightResult = isLeft ? entry.resultP2 : entry.resultP1}

		<div class="match-item {viewerId ? `border-${changeClass(leftChange)}` : ''}">
			<div class="match-row">
				<div class="history-match-players">
					<span class={changeClass(leftChange)}>
						({leftChange > 0 ? "+" : ""}{leftChange})
					</span>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						class="history-match-player-name match-opponent"
						onclick={() => openPlayer(left)}
					>
						{getPlayerName(left)}
					</span>
					{#if right}
						<span class="history-match-player-name">vs</span>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span
							class="history-match-player-name match-opponent"
							onclick={() => openPlayer(right!)}
						>
							{getPlayerName(right)}
						</span>
						<span class={changeClass(rightChange!)}>
							({rightChange! > 0 ? "+" : ""}{rightChange})
						</span>
					{:else if viewerId}
						<span class="history-match-player-name match-adjustment"
							>Корректировка ELO</span
						>
					{:else}
						<span class="history-match-player-name match-adjustment"
							>— Корректировка ELO</span
						>
					{/if}
				</div>
				<div class="match-meta">
					{#if entry.tournamentId}
						<a
							class="match-tournament-link"
							href={resolve(`/tournaments/${entry.tournamentId}`)}
						>
							Турнир
						</a>
					{/if}
					{#if entry.kind === "tech_loss"}
						<span class="history-match-techloss">Техлуз</span>
					{/if}
					<span>{formatDate(entry.timestamp)}</span>
					{#if $isAdmin}
						<button
							class="icon-btn danger"
							onclick={() => handleDelete(entry.id)}
						>
							✕
						</button>
					{/if}
				</div>
			</div>

			{#if entry.resultP1 && entry.resultP2}
				<div class="match-result">
					<span>{leftResult}</span>
					<span class="history-match-vs">—</span>
					<span>{rightResult}</span>
					{#if entry.resultScreenshotUrl}
						<button
							class="btn-common history-img-btn"
							onclick={() => openImagePopup(entry.resultScreenshotUrl!)}
						>
							Скриншот результатов
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<span>{loading ? "Загрузка..." : "Игр пока нет"}</span>
	{/each}
</div>

{#if hasMore}
	<div class="load-sentinel" bind:this={sentinel}>
		{#if loadingMore}
			<span class="load-more-status">Загрузка...</span>
		{/if}
	</div>
{/if}

<style>
	.match-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 8px;
		border-left: 8px solid transparent;
		border-color: #555;
		background: rgba(255, 255, 255, 0.03);
	}

	.match-item.border-gain {
		border-color: var(--green);
	}

	.match-item.border-loss {
		border-color: var(--loss);
	}

	.match-item.border-neutral {
		border-color: #555;
	}

	.match-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.history-match-players {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.history-match-player-name {
		font-weight: bold;
	}

	.match-opponent {
		cursor: pointer;
	}

	.match-opponent:hover {
		text-decoration: underline;
	}

	.match-meta {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 16px;
		color: #888;
	}

	.gain {
		color: var(--green);
	}

	.loss {
		color: var(--loss);
	}

	.neutral {
		color: #888;
	}

	.history-match-techloss {
		color: var(--loss);
	}

	.match-tournament-link {
		color: var(--gold);
	}

	.match-tournament-link:hover {
		text-decoration: underline;
	}

	.match-adjustment {
		color: #888;
		font-weight: normal;
	}

	.legacy-divider {
		text-align: center;
		color: #888;
		padding: 8px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
	}

	.match-result {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #ccc;
	}

	.history-match-vs {
		color: #666;
	}

	.history-img-btn {
		margin-left: auto;
		padding: 6px 12px;
		width: auto;
	}

	.load-sentinel {
		display: flex;
		justify-content: center;
		padding: 16px 0;
	}

	.load-more-status {
		color: #888;
	}
</style>
