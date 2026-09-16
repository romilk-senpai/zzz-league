<script lang="ts">
	import { untrack } from "svelte";
	import { resolve } from "$app/paths";
	import { _, locale, formatDate as formatLocalizedDate } from "$lib/i18n";
	import {
		deleteHistoryEntry,
		getTeam,
		getTournament,
		listHistoryByPlayerPage,
		listHistoryPage,
		listMatches,
		listPlayers,
		listRegistrations,
	} from "$lib/backend";
	import TournamentMatchPopup from "$lib/components/TournamentMatchPopup.svelte";
	import { isAdmin } from "$lib/store";
	import type {
		HistoryCursor,
		HistoryEntry,
		PlayerListItem,
		RegisteredPlayer,
		Team,
		Tournament,
		TournamentMatch,
	} from "$lib/types";
	import { dateDisplayOptions, openProfilePopup } from "$lib/uiCommon";

	let { viewerId = undefined }: { viewerId?: string } = $props();

	const PAGE_SIZE = 25;

	// The API only supports keyset ("seek") pagination — no offset/page-number or total-count
	// query — so a real Prev/Next pager has to cache each page it has already fetched (by index)
	// plus the cursor that leads INTO each page, rather than being able to jump to an arbitrary
	// page number. Going back re-displays a cached page instead of re-fetching it.
	let pageIndex = $state(0);
	let pageCache = $state<HistoryEntry[][]>([]);
	let cursorForPage = $state<(HistoryCursor | null)[]>([null]);
	let hasMoreAfterPage = $state<boolean[]>([]);
	let loading = $state(true);

	let entries = $derived(pageCache[pageIndex] ?? []);

	// Resolved lazily as entries load — batch-fetch just the uids that appear on loaded pages,
	// instead of relying on a preloaded global player list.
	let resolvedPlayers = $state<Map<string, PlayerListItem>>(new Map());

	async function resolvePlayersFor(pageEntries: HistoryEntry[]) {
		const uids = new Set<string>();
		for (const e of pageEntries) {
			uids.add(e.p1PlayerId);
			if (e.p2PlayerId) uids.add(e.p2PlayerId);
		}

		const missing = [...uids].filter((uid) => !resolvedPlayers.has(uid));
		if (missing.length === 0) return;

		const loaded = await listPlayers(missing);
		const next = new Map(resolvedPlayers);
		for (const p of loaded) next.set(p.uid, p);
		resolvedPlayers = next;
	}

	const LEGACY_CUTOFF_TIMESTAMP = 1783017803637;

	const legacyDividerEntryId = $derived(
		entries.find((e) => e.timestamp <= LEGACY_CUTOFF_TIMESTAMP)?.id,
	);

	function getPlayerName(uid: string) {
		return resolvedPlayers.get(uid)?.name ?? uid;
	}

	function openPlayer(uid: string) {
		const player = resolvedPlayers.get(uid);
		if (player) openProfilePopup(player);
	}

	function formatDate(timestamp: number) {
		return formatLocalizedDate(new Date(timestamp), dateDisplayOptions, $locale);
	}

	function changeClass(change: number) {
		if (change > 0) return "gain";
		if (change < 0) return "loss";
		return "neutral";
	}

	async function handleDelete(id: string) {
		if (
			!confirm($_("historyList.confirmDelete"))
		)
			return;
		try {
			await deleteHistoryEntry(id);
		} catch (error) {
			alert(error);
		}
	}

	// History entries link to a real TournamentMatch (tournamentMatchId) — clicking a row loads
	// everything TournamentMatchPopup needs (tournament, the match itself, registered players,
	// teams) on demand, since HistoryList itself only ever resolves the two participants' names.
	let matchPopupOpen = $state(false);
	let matchPopupTournament = $state<Tournament>();
	let matchPopupMatch = $state<TournamentMatch>();
	let matchPopupRegisteredPlayers = $state<RegisteredPlayer[]>([]);
	let matchPopupTeamsById = $state<Map<string, Team>>(new Map());
	let loadingMatchEntryId = $state<string | null>(null);

	async function openMatchFromEntry(entry: HistoryEntry) {
		if (!entry.tournamentId || !entry.tournamentMatchId || loadingMatchEntryId)
			return;
		loadingMatchEntryId = entry.id;
		try {
			const [tournament, matches, registrations] = await Promise.all([
				getTournament(entry.tournamentId),
				listMatches(entry.tournamentId),
				listRegistrations(entry.tournamentId),
			]);
			const match = matches.find((m) => m.id === entry.tournamentMatchId);
			if (!tournament || !match) return;

			const teamIds = registrations
				.map((r) => r.teamId)
				.filter((id): id is string => !!id);
			const teamsById = new Map<string, Team>();
			(await Promise.all(teamIds.map((teamId) => getTeam(teamId)))).forEach(
				(team, i) => {
					if (team) teamsById.set(teamIds[i], team);
				},
			);

			const soloUids = registrations
				.map((r) => r.playerId)
				.filter((uid): uid is string => !!uid);
			const teamUids = teamIds.flatMap((teamId) => {
				const team = teamsById.get(teamId);
				return team ? [team.creator.uid, team.player2.uid] : [];
			});
			const players = await listPlayers([...new Set([...soloUids, ...teamUids])]);

			matchPopupRegisteredPlayers = registrations
				.map((registration) => {
					const player = registration.playerId
						? players.find((p) => p.uid === registration.playerId)
						: undefined;
					return player ? { player, registration } : null;
				})
				.filter(Boolean) as RegisteredPlayer[];
			matchPopupTeamsById = teamsById;
			matchPopupTournament = tournament;
			matchPopupMatch = match;
			matchPopupOpen = true;
		} catch (error) {
			alert(error);
		} finally {
			loadingMatchEntryId = null;
		}
	}

	let generation = 0;

	function fetchPage(currentViewerId: string | undefined, pageCursor: HistoryCursor | null) {
		return currentViewerId
			? listHistoryByPlayerPage(currentViewerId, pageCursor, PAGE_SIZE)
			: listHistoryPage(pageCursor, PAGE_SIZE);
	}

	async function loadPage(index: number) {
		if (index < 0) return;
		if (pageCache[index]) {
			pageIndex = index;
			return;
		}

		const myGeneration = generation;
		loading = true;
		try {
			const page = await fetchPage(viewerId, cursorForPage[index] ?? null);
			if (myGeneration !== generation) return;

			pageCache[index] = page.entries;
			hasMoreAfterPage[index] = page.hasMore;
			if (page.hasMore && page.entries.length) {
				const lastEntry = page.entries[page.entries.length - 1];
				cursorForPage[index + 1] = { timestamp: lastEntry.timestamp, id: lastEntry.id };
			}
			resolvePlayersFor(page.entries);
			pageIndex = index;
		} finally {
			if (myGeneration === generation) loading = false;
		}
	}

	$effect(() => {
		viewerId;
		// `loadPage`'s pre-await code reads pageCache/cursorForPage/generation — inside a bare
		// effect body those reads would register as dependencies, and loadPage's own later writes
		// to pageCache would then re-trigger this very effect (infinite reset-and-refetch loop).
		// `untrack` keeps this effect's only real dependency as `viewerId`.
		untrack(() => {
			generation++;
			pageIndex = 0;
			pageCache = [];
			cursorForPage = [null];
			hasMoreAfterPage = [];
			loadPage(0);
		});
	});
</script>

<div class="match-list">
	{#each entries as entry (entry.id)}
		{#if entry.id === legacyDividerEntryId}
			<div class="legacy-divider">{$_("historyList.legacyDivider")}</div>
		{/if}

		{@const isLeft = !viewerId || entry.p1PlayerId === viewerId}
		{@const left = isLeft ? entry.p1PlayerId : entry.p2PlayerId!}
		{@const right = isLeft ? entry.p2PlayerId : entry.p1PlayerId}
		{@const leftChange = isLeft ? entry.p1Change : entry.p2Change!}
		{@const rightChange = isLeft ? entry.p2Change : entry.p1Change}
		{@const leftResult = isLeft ? entry.resultP1 : entry.resultP2}
		{@const rightResult = isLeft ? entry.resultP2 : entry.resultP1}

		{@const canOpenMatch = !!entry.tournamentId && !!entry.tournamentMatchId}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="h-item {viewerId ? changeClass(leftChange) : ''}"
			class:clickable={canOpenMatch}
			class:btn-loading={loadingMatchEntryId === entry.id}
			onclick={() => canOpenMatch && openMatchFromEntry(entry)}
		>
			<div class="h-players">
				<span class="h-delta {changeClass(leftChange)}"
					>{leftChange > 0 ? "+" : ""}{leftChange}</span
				>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="h-name"
					onclick={(e) => {
						e.stopPropagation();
						openPlayer(left);
					}}
				>
					{getPlayerName(left)}
				</span>
				{#if right}
					<span class="h-vs">vs</span>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						class="h-name"
						class:opponent={!!viewerId}
						onclick={(e) => {
							e.stopPropagation();
							openPlayer(right!);
						}}
					>
						{getPlayerName(right)}
					</span>
					<span class="h-delta {changeClass(rightChange!)}"
						>{rightChange! > 0 ? "+" : ""}{rightChange}</span
					>
				{:else if viewerId}
					<span class="h-vs adjustment">{$_("historyList.eloAdjustment")}</span>
				{:else}
					<span class="h-vs adjustment">— {$_("historyList.eloAdjustment")}</span>
				{/if}
			</div>
			<div class="h-score-wrap">
				{#if entry.resultP1 && entry.resultP2}
					<span class="h-score">{leftResult}–{rightResult}</span>
				{:else if entry.kind === "tech_loss" || right}
					<span class="h-score techloss">{$_("historyList.techLoss")}</span>
				{/if}
			</div>
			<div class="h-meta">
				{#if entry.tournamentId}
					<a
						class="h-tournament"
						href={resolve(`/tournaments/${entry.tournamentId}`)}
						onclick={(e) => e.stopPropagation()}
					>
						{entry.tournamentName ?? $_("historyList.tournament")}
					</a>
				{:else}
					<span></span>
				{/if}
				<span class="h-date">{formatDate(entry.timestamp)}</span>
				{#if $isAdmin}
					<button
						class="h-icon-btn danger"
						title={$_("common.delete")}
						onclick={(e) => {
							e.stopPropagation();
							handleDelete(entry.id);
						}}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				{:else}
					<span></span>
				{/if}
			</div>
		</div>
	{:else}
		<span>{loading ? $_("common.loading") : $_("historyList.noGames")}</span>
	{/each}
</div>

{#if pageIndex > 0 || hasMoreAfterPage[pageIndex]}
	<div class="pager">
		<button
			class="btn-common pager-btn"
			disabled={pageIndex === 0 || loading}
			onclick={() => loadPage(pageIndex - 1)}
			>← {$_("common.back")}</button
		>
		<span class="pager-label"
			>{$_("historyList.pageLabel", { values: { page: pageIndex + 1 } })}</span
		>
		<button
			class="btn-common pager-btn"
			disabled={!hasMoreAfterPage[pageIndex] || loading}
			onclick={() => loadPage(pageIndex + 1)}
			>{$_("historyList.next")} →</button
		>
	</div>
{/if}

{#if matchPopupOpen}
	<TournamentMatchPopup
		bind:open={matchPopupOpen}
		tournament={matchPopupTournament}
		match={matchPopupMatch}
		registeredPlayers={matchPopupRegisteredPlayers}
		teamsById={matchPopupTeamsById}
	></TournamentMatchPopup>
{/if}

<style>
	.h-item {
		--btn-fg: var(--text);
		display: flex;
		align-items: center;
		gap: 14px;
		height: 38px;
		padding: 0 12px;
		border-radius: var(--r-sm);
		border-left: 3px solid var(--border);
		background: var(--surface-2);
		font-size: 14px;
		transition: background 0.15s;
	}

	.h-item.gain {
		border-left-color: var(--success);
	}

	.h-item.loss {
		border-left-color: var(--danger);
	}

	.h-item.clickable {
		cursor: pointer;
	}

	.h-item.clickable:hover {
		background: var(--surface-hover);
	}

	.h-players {
		display: flex;
		align-items: center;
		gap: 7px;
		font-weight: 600;
		flex: 1;
		min-width: 0;
	}

	.h-name {
		cursor: pointer;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.h-name:hover {
		text-decoration: underline;
	}

	.h-name.opponent {
		color: var(--text-dim);
		font-weight: 500;
	}

	.h-vs {
		color: var(--text-dim);
		font-weight: 500;
		font-size: 12px;
		flex-shrink: 0;
	}

	.h-vs.adjustment {
		font-weight: normal;
	}

	.h-delta {
		font-size: 11px;
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 4px;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.h-delta.gain {
		color: var(--success);
		background: var(--success-dim);
	}

	.h-delta.loss {
		color: var(--danger);
		background: var(--danger-dim);
	}

	.h-delta.neutral {
		color: var(--text-dim);
		background: var(--surface-hover);
	}

	.h-score-wrap {
		flex: 1;
		display: flex;
		justify-content: center;
		min-width: 0;
	}

	.h-meta {
		display: grid;
		grid-template-columns: 182px 104px 24px;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.h-score {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.h-score.techloss {
		color: var(--danger);
	}

	.h-tournament {
		font-size: 12px;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.h-tournament:hover {
		text-decoration: underline;
	}

	.h-date {
		font-size: 12px;
		color: var(--text-dim);
		white-space: nowrap;
		text-align: right;
	}

	.h-icon-btn {
		width: 24px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r-sm);
		background: none;
		border: none;
		padding: 0;
		color: var(--text-dim);
		flex-shrink: 0;
		cursor: pointer;
		justify-self: center;
	}

	.h-icon-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.h-icon-btn.danger:hover {
		color: var(--danger);
		background: var(--danger-dim);
	}

	.legacy-divider {
		text-align: center;
		color: var(--text-dim);
		font-size: 12px;
		padding: 4px 0;
		border-bottom: 1px solid var(--border-soft);
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 16px 0 4px;
	}

	.pager-btn {
		height: 32px;
		font-size: 12px;
		padding: 0 14px;
	}

	.pager-label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}
</style>
