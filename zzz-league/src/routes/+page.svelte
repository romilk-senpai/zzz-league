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

	let timerText = $derived.by(() => {
		if (!$seasonTimerEndsAt) return null;
		const diff = $seasonTimerEndsAt - now;
		if (diff <= 0) return "СЕЗОН ОКОНЧЕН";
		const d = Math.floor(diff / 86400000);
		const h = Math.floor((diff % 86400000) / 3600000);
		const m = Math.floor((diff % 3600000) / 60000);
		const s = Math.floor((diff % 60000) / 1000);
		return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
	<div class="card main-content">
		{#if timerText}
			<div class="main-timer">
				<div class="timer-label">ДО КОНЦА ЛИГИ:</div>
				<div class="timer-value">{timerText}</div>
			</div>
		{/if}

		{#if filteredTournaments && filteredTournaments.length > 0}
			<div>
				<h2>Турниры:</h2>
				<div class="tournament-container">
					{#each filteredTournaments as tournament}
						<TournamentCard {tournament} {now} />
					{/each}
				</div>
			</div>
		{/if}

		<div class="search-container">
			<h2>
				{isViewingArchive
					? `Архив: ${archiveKey}`
					: "Турнирная Таблица ZZZ"}
			</h2>
			<div style="display:flex; align-items:center; gap:10px;">
				{#if isViewingArchive}
					<button class="btn-common back-btn" onclick={loadLive}
						>← ТЕКУЩАЯ ЛИГА</button
					>
				{/if}
				<label class="filter-toggle">
					<input type="checkbox" bind:checked={showInactivePlayers} />
					<p>Показать неактивных игроков</p>
				</label>
				<input
					class="search-input"
					placeholder="Поиск..."
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<div
			class="table-wrapper"
			use:capDefaultHeight={{ trigger: displayPlayers.length }}
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

		{#if archives.length > 0}
			<div class="archive-section">
				<div class="section-label">АРХИВ СЕЗОНОВ:</div>
				<div class="archive-buttons">
					{#each [...archives].reverse() as archive (archive.id)}
						<button
							class="btn-common"
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
	.main-timer {
		background: #222;
		border: 1px solid #444;
		border-radius: 8px;
		padding: 15px;
		margin-bottom: 20px;
		font-size: 16px;
		text-align: center;
	}

	.timer-label {
		color: #888;
	}

	.timer-value {
		color: var(--gold);
		font-size: 18px;
		font-weight: bold;
		text-shadow: 0 0 10px rgba(255, 204, 0, 0.3);
		margin-top: 4px;
	}

	.back-btn {
		margin-top: 0;
		padding: 8px 14px;
	}

	.archive-section {
		margin-top: 25px;
		border-top: 1px solid #333;
		padding-top: 20px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.archive-buttons {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;
	}

	.archive-buttons .btn-common {
		padding: 8px 14px;
	}

	.section-label {
		width: 100%;
		color: #555;
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		color: #ccc;
	}

	.filter-toggle input {
		padding: 0;
	}

	.filter-toggle p {
		white-space: nowrap;
	}
</style>
