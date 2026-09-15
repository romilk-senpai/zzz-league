<script lang="ts">
	import { onMount } from "svelte";
	import { listArchives, listPlayers } from "$lib/backend";
	import type { Archive, Player, PlayerListItem } from "$lib/types";
	import Leaderboard from "$lib/components/Leaderboard.svelte";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import TournamentCard from "$lib/components/TournamentCard.svelte";
	import { isAdmin, seasonTimerEndsAt, tournaments, refreshSeasonTimer } from "$lib/store";
	import { capDefaultHeight } from "$lib/actions/capDefaultHeight";
	import { TOURNAMENT_STATE } from "$lib/tournamentState";

	let filteredTournaments = $derived(
		$tournaments
			.filter((t) => {
				if (t.visible === false && !$isAdmin) return false;
				if (t.state !== TOURNAMENT_STATE.COMPLETE) return true;
				const expiration = 1 * 24 * 60 * 60 * 1000;
				return Date.now() - t.tournamentEndDate < expiration;
			})
			.sort((a, b) => b.tournamentStartDate - a.tournamentStartDate),
	);

	let archives = $state<Archive[]>([]);
	let livePlayers = $state<PlayerListItem[]>([]);

	let searchQuery = $state("");
	let showInactivePlayers = $state(false);

	let isViewingArchive = $state(false);
	let archiveKey = $state("");

	let displayPlayers = $derived(
		isViewingArchive
			? (archives.find((a) => a.seasonName === archiveKey)?.players ?? [])
			: livePlayers,
	);

	function handlePlayerUpdated(updated: Player) {
		const index = livePlayers.findIndex((p) => p.uid === updated.uid);
		if (index === -1) return;
		const next = [...livePlayers];
		next[index] = updated;
		livePlayers = next;
	}

	function handlePlayerDeleted(uid: string) {
		livePlayers = livePlayers.filter((p) => p.uid !== uid);
	}

	let now = $state(Date.now());

	let timerParts = $derived.by(() => {
		if (!$seasonTimerEndsAt) return null;
		const diff = $seasonTimerEndsAt - now;
		if (diff <= 0) return { ended: true as const };
		return {
			ended: false as const,
			d: Math.floor(diff / 86400000),
			h: Math.floor((diff % 86400000) / 3600000),
			m: Math.floor((diff % 3600000) / 60000),
			s: Math.floor((diff % 60000) / 1000),
		};
	});

	onMount(() => {
		listArchives().then((loaded) => (archives = loaded));
		listPlayers().then((loaded) => (livePlayers = loaded));
		refreshSeasonTimer();

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	function loadArchive(key: string) {
		isViewingArchive = true;
		archiveKey = key;
	}

	function loadLive() {
		isViewingArchive = false;
		archiveKey = "";
	}

</script>

<div class="layout">
	<SidePanel></SidePanel>
	<div class="main-content">
		{#if timerParts}
			<div class="timer-card">
				<div class="timer-info">
					<div class="timer-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
					</div>
					<div class="timer-label">До конца лиги</div>
				</div>
				{#if timerParts.ended}
					<div class="timer-ended">СЕЗОН ОКОНЧЕН</div>
				{:else}
					<div class="timer-segments">
						<div class="timer-segment">
							<div class="timer-value gold">{timerParts.d}</div>
							<div class="timer-unit">дней</div>
						</div>
						<div class="timer-colon">:</div>
						<div class="timer-segment">
							<div class="timer-value">{String(timerParts.h).padStart(2, "0")}</div>
							<div class="timer-unit">час</div>
						</div>
						<div class="timer-colon">:</div>
						<div class="timer-segment">
							<div class="timer-value">{String(timerParts.m).padStart(2, "0")}</div>
							<div class="timer-unit">мин</div>
						</div>
						<div class="timer-colon">:</div>
						<div class="timer-segment">
							<div class="timer-value dim">{String(timerParts.s).padStart(2, "0")}</div>
							<div class="timer-unit">сек</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if filteredTournaments && filteredTournaments.length > 0}
			<div>
				<h2 class="section-heading">Турниры:</h2>
				<div class="tournament-container">
					{#each filteredTournaments as tournament}
						<TournamentCard {tournament} {now} />
					{/each}
				</div>
			</div>
		{/if}

		<div class="card leaderboard-card">
			<div class="search-container">
				<h2>
					{isViewingArchive
						? `Архив: ${archiveKey}`
						: "Турнирная Таблица ZZZ"}
				</h2>
				<div style="display:flex; align-items:center; gap:16px;">
					{#if isViewingArchive}
						<button class="btn-common current-league-btn" onclick={loadLive}
							>← Текущая лига</button
						>
					{/if}
					<label class="filter-toggle">
						<span class="cb-wrap">
							<input type="checkbox" bind:checked={showInactivePlayers} class="cb-input" />
							{#if showInactivePlayers}
								<svg class="cb-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{/if}
						</span>
						<p>Показать неактивных игроков</p>
					</label>
					<div class="search-field">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
						<input
							class="search-input"
							placeholder="Поиск..."
							bind:value={searchQuery}
						/>
					</div>
				</div>
			</div>

			<div
				class="table-wrapper"
				use:capDefaultHeight={{
					trigger: displayPlayers.length,
					// header (33.5px) + 12 full rows (51px each) — keeps the capped height from
					// ever stopping mid-row.
					maxHeight: 33.5 + 12 * 51,
				}}
			>
				<Leaderboard
					players={displayPlayers}
					{searchQuery}
					{showInactivePlayers}
					hideOptions={isViewingArchive}
					onPlayerUpdated={handlePlayerUpdated}
					onPlayerDeleted={handlePlayerDeleted}
				/>
			</div>
		</div>

		{#if archives.length > 0}
			<div class="archive-section">
				<div class="section-label">Архив сезонов:</div>
				<div class="archive-buttons">
					{#each [...archives].reverse() as archive (archive.id)}
						<button
							class="btn-common btn-sm"
							onclick={() => loadArchive(archive.seasonName)}
							>{archive.seasonName}</button
						>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.timer-card {
		background: var(--surface);
		border: 1px solid var(--border-soft);
		border-left: var(--r-lg) solid var(--gold);
		border-radius: var(--r-lg);
		padding: 14px 22px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.timer-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.timer-icon {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--gold-dim);
		color: var(--gold);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.timer-label {
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
	}

	.timer-ended {
		font-size: 16px;
		font-weight: 800;
		color: var(--danger);
	}

	.timer-segments {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.timer-segment {
		text-align: center;
	}

	.timer-value {
		font-size: 22px;
		font-weight: 800;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.timer-value.gold {
		color: var(--gold);
	}

	.timer-value.dim {
		color: var(--text-muted);
	}

	.timer-unit {
		font-size: 9px;
		color: var(--text-dim);
		margin-top: 3px;
	}

	.timer-colon {
		font-size: 18px;
		color: var(--border);
		font-weight: 700;
		padding-bottom: 11px;
	}

	.section-heading {
		font-size: 16px;
		color: var(--gold);
		border: none;
		padding: 0;
		margin-bottom: 12px;
	}

	.leaderboard-card {
		padding: 0;
		gap: 0;
	}

	.leaderboard-card .search-container {
		padding: 16px 20px;
		margin: 0;
	}

	.leaderboard-card .search-container h2 {
		font-size: 16px;
	}

	.leaderboard-card .table-wrapper {
		border: none;
		border-radius: 0 0 var(--r-lg) var(--r-lg);
	}

	.search-field {
		position: relative;
		width: 160px;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}

	.search-field .search-input {
		width: 100%;
		padding-left: 28px;
	}

	.current-league-btn {
		height: 32px;
		padding: 0 14px;
		font-size: 12px;
	}

	.archive-section {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.archive-buttons {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;
	}

	.archive-buttons .btn-common {
		height: 32px;
		padding: 0 12px;
		font-size: 12px;
	}

	.section-label {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dim);
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		font-size: 12px;
		color: var(--text-muted);
	}

	.filter-toggle p {
		white-space: nowrap;
	}

	.cb-wrap {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
		width: 15px;
		height: 15px;
	}

	.cb-input {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		box-sizing: border-box;
		flex: 0 0 15px;
		min-width: 15px;
		max-width: 15px;
		width: 15px;
		height: 15px;
		margin: 0;
		padding: 0;
		border-radius: 4px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		cursor: pointer;
	}

	.cb-input:checked {
		background: var(--gold);
		border-color: var(--gold);
	}

	.cb-check {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: oklch(0.2 0.03 80);
		pointer-events: none;
	}
</style>
