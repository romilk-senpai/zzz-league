<script lang="ts">
	import {
		addPlayer,
		backfillLastPlayedTimestamps,
		finalizeTournament,
		listPlayers,
		previewEloChange,
		registerMatch,
		resetSeason,
		setSeasonTimer,
	} from "$lib/backend";
	import { refreshSeasonTimer } from "$lib/store";
	import type { PlayerListItem } from "$lib/types";
	import { resolve } from "$app/paths";
	import { onMount } from "svelte";
	import { _ } from "$lib/i18n";

	let players = $state<PlayerListItem[]>([]);

	onMount(() => {
		listPlayers().then((loaded) => (players = loaded));
	});

	// Only for bulk operations that genuinely affect every player (reset season, backfill,
	// finalize tournament) — single/paired-player mutations patch `players` in place instead
	// (see patchPlayers/handleAddPlayer/handleRegisterMatch).
	async function reloadPlayers() {
		players = await listPlayers();
	}

	function patchPlayers(updated: PlayerListItem[]) {
		const byUid = new Map(updated.map((p) => [p.uid, p]));
		players = [
			...players.map((p) => byUid.get(p.uid) ?? p),
			...updated.filter((p) => !players.some((existing) => existing.uid === p.uid)),
		].sort((a, b) => a.name.localeCompare(b.name));
	}

	let searchQueryP1 = $state("");
	let selectedPlayer1: PlayerListItem | null = $state(null);
	let filteredPlayers1 = $derived(
		players.filter((p) =>
			p.name.toLowerCase().includes(searchQueryP1.toLowerCase()),
		),
	);

	let searchQueryP2 = $state("");
	let selectedPlayer2: PlayerListItem | null = $state(null);
	let filteredPlayers2 = $derived(
		players.filter((p) =>
			p.name.toLowerCase().includes(searchQueryP2.toLowerCase()),
		),
	);

	$effect(() => {
		if (filteredPlayers1.length > 0) {
			selectedPlayer1 = filteredPlayers1[0];
		}
		if (filteredPlayers2.length > 0) {
			selectedPlayer2 = filteredPlayers2[0];
		}
	});

	type Forecast = {
		p1: { player: PlayerListItem; w: number; l: number };
		p2: { player: PlayerListItem; w: number; l: number };
	};

	let showingForecast = $state(false);
	let forecast = $state<Forecast | null>(null);

	let winningPlayer = $state("1");

	async function handleSetTimer() {
		const hours = prompt($_("adminPanel.setTimerPrompt"));
		if (hours) {
			try {
				await setSeasonTimer(Date.now() + parseFloat(hours) * 3600000);
				await refreshSeasonTimer();
			} catch (error) {
				alert(error);
			}
		}
	}

	async function handleAddPlayer() {
		const playerName = prompt($_("adminPanel.addPlayerPrompt"));
		if (!playerName) return;
		if (playerName.length < 2) alert($_("adminPanel.playerNameTooShort"));
		try {
			const created = await addPlayer(playerName);
			patchPlayers([created]);
		} catch (error) {
			alert(error);
		}
	}

	async function showForecast() {
		if (
			!selectedPlayer1 ||
			!selectedPlayer2 ||
			selectedPlayer1.name === selectedPlayer2.name
		) {
			return alert($_("adminPanel.selectDifferentPlayersShort"));
		}

		try {
			const preview = await previewEloChange(selectedPlayer1.uid, selectedPlayer2.uid);
			forecast = {
				p1: { player: selectedPlayer1, w: preview.p1ChangeOnWin, l: preview.p1ChangeOnLoss },
				p2: { player: selectedPlayer2, w: preview.p2ChangeOnWin, l: preview.p2ChangeOnLoss },
			};
			showingForecast = true;
		} catch (error) {
			alert(error);
		}
	}

	let registeringMatch = false;
	async function handleRegisterMatch() {
		if (registeringMatch) return;
		if (
			!selectedPlayer1 ||
			!selectedPlayer2 ||
			selectedPlayer1.name === selectedPlayer2.name
		) {
			alert($_("adminPanel.selectDifferentPlayers"));
			return;
		}

		registeringMatch = true;
		try {
			const winner = parseInt(winningPlayer);

			await registerMatch(
				selectedPlayer1.uid,
				selectedPlayer2.uid,
				winner === 1,
				-1,
			);
			patchPlayers(await listPlayers([selectedPlayer1.uid, selectedPlayer2.uid]));

			showingForecast = false;
		} catch (error) {
			alert(error);
		} finally {
			registeringMatch = false;
		}
	}

	let registeringTechLoss = false;
	async function handleRegisterTechLoss() {
		if (registeringTechLoss) return;
		if (
			!selectedPlayer1 ||
			!selectedPlayer2 ||
			selectedPlayer1.name === selectedPlayer2.name
		) {
			alert($_("adminPanel.selectDifferentPlayers"));
			return;
		}

		const winner = parseInt(winningPlayer);
		const loserName =
			winner === 1 ? selectedPlayer2.name : selectedPlayer1.name;
		if (
			!confirm(
				$_("adminPanel.techLossConfirm", { values: { loserName } }),
			)
		) {
			return;
		}

		registeringTechLoss = true;
		try {
			await registerMatch(
				selectedPlayer1.uid,
				selectedPlayer2.uid,
				winner === 1,
				-1,
				true,
			);
			patchPlayers(await listPlayers([selectedPlayer1.uid, selectedPlayer2.uid]));

			showingForecast = false;
		} catch (error) {
			alert(error);
		} finally {
			registeringTechLoss = false;
		}
	}

	async function handleResetSeason() {
		const name = prompt($_("adminPanel.resetSeasonPrompt"));
		if (!name) return;
		try {
			await resetSeason(name);
			await reloadPlayers();
		} catch (error) {
			alert(error);
		}
	}

	async function handleBackfillLastPlayed() {
		if (!confirm($_("adminPanel.backfillConfirm")))
			return;
		try {
			const { updatedPlayers } = await backfillLastPlayedTimestamps();
			await reloadPlayers();
			alert($_("adminPanel.backfillDone", { values: { count: updatedPlayers } }));
		} catch (error) {
			alert(error);
		}
	}

	async function handleFinalizeTournament() {
		if (!confirm($_("adminPanel.finalizeConfirm"))) return;

		try {
			await finalizeTournament();
			await reloadPlayers();
		} catch (error) {
			alert(error);
		}
	}
</script>

<div class="card admin-card">
	<h2>{$_("adminPanel.title")}</h2>

	<div class="stack">
		<a class="btn-common" href={resolve("/tournaments/create")}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			{$_("adminPanel.createTournament")}</a
		>
		<button type="button" class="btn-common btn-success" onclick={handleFinalizeTournament}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			{$_("adminPanel.applyResults")}
		</button>
	</div>

	<div class="divider"></div>

	<div class="grid-2">
		<button class="btn-common btn-sm" onclick={handleSetTimer} title={$_("adminPanel.setTimerTooltip")}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
			{$_("adminPanel.timerButton")}
		</button>
		<button class="btn-common btn-sm" onclick={handleAddPlayer} title={$_("adminPanel.addPlayerTooltip")}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
			{$_("adminPanel.addPlayerButton")}
		</button>
	</div>

	<div class="divider"></div>

	<div class="section-label">{$_("adminPanel.matchRecordingLabel")}</div>

	<div class="stack">
		<input
			type="text"
			class="search-input"
			placeholder={$_("adminPanel.searchPlayer1Placeholder")}
			bind:value={searchQueryP1}
		/>
		<select bind:value={selectedPlayer1}>
			{#each filteredPlayers1 as player}
				<option value={player}>{player.name}</option>
			{/each}
		</select>

		<input
			type="text"
			class="search-input"
			placeholder={$_("adminPanel.searchPlayer2Placeholder")}
			bind:value={searchQueryP2}
			style="margin-top: 4px;"
		/>
		<select bind:value={selectedPlayer2}>
			{#each filteredPlayers2 as player}
				<option value={player}>{player.name}</option>
			{/each}
		</select>

		<button class="btn-common btn-sm" onclick={showForecast} style="margin-top: 2px;">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
			{$_("adminPanel.eloForecastButton")}
		</button>

		{#if showingForecast}
			{@const f = forecast!}
			<div class="forecast-box">
				<div>
					{f.p1.player.name}:
					<span class="gain">{f.p1.w}</span> /
					<span class="loss">{f.p1.l}</span>
				</div>

				<div>
					{f.p2.player.name}:
					<span class="gain">{f.p2.w}</span> /
					<span class="loss">{f.p2.l}</span>
				</div>
			</div>
		{/if}

		<select bind:value={winningPlayer} style="margin-top: 2px;">
			<option value="1">{$_("adminPanel.player1WinOption")}</option>
			<option value="0">{$_("adminPanel.player2WinOption")}</option>
		</select>
		<button type="button" class="btn-common btn-play" onclick={handleRegisterMatch} style="margin-top: 2px;">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
			{$_("adminPanel.registerMatchButton")}
		</button>
		<button type="button" class="btn-common btn-danger-ghost btn-sm" onclick={handleRegisterTechLoss}>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/></svg>
			{$_("adminPanel.techLossButton")}
		</button>
	</div>

	<div class="divider"></div>

	<button type="button" class="btn-common btn-danger-ghost btn-sm" onclick={handleResetSeason}>
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
		{$_("adminPanel.resetSeasonButton")}
	</button>
</div>

<style>
	.admin-card {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.admin-card :global(h2) {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-dim);
		border: none;
		padding: 0;
		margin-bottom: 14px;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
		margin: 14px 0;
	}

	.section-label {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dim);
		margin-bottom: 10px;
	}


	.forecast-box {
		background: var(--bg-elevated);
		padding: 12px 14px;
		border-radius: var(--r-md);
		border: 1px dashed var(--border);
		font-size: 12px;
		line-height: 1.6;
	}
</style>
