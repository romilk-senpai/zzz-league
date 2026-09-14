<script lang="ts">
	import { adminAddTournamentRegistration, listPlayers } from "$lib/backend";
	import type { PlayerListItem } from "$lib/types";

	let {
		open = $bindable(false),
		tournament = undefined,
		registeredUids = [],
	}: {
		open?: boolean;
		tournament?: any;
		registeredUids: string[];
	} = $props();

	let searchQuery = $state("");
	let selectedUid = $state("");
	let status = $state("");
	let players = $state<PlayerListItem[]>([]);

	$effect(() => {
		if (open) {
			listPlayers().then((loaded) => (players = loaded));
		}
	});

	let availablePlayers = $derived(
		players.filter(
			(p) =>
				!registeredUids.includes(p.uid) &&
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	let isAdding = $state(false);
	async function handleAdd() {
		if (isAdding || !selectedUid) return;

		isAdding = true;
		try {
			await adminAddTournamentRegistration(tournament.id, selectedUid);
			status = "";
			open = false;
		} catch (error: any) {
			status = error.message;
		} finally {
			isAdding = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card add-player-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label="Закрыть">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<h2 class="popup-title">Добавить игрока</h2>

			<div class="form-group">
				<label for="add-player-search">Поиск игрока</label>
				<span class="search-wrap">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input
						id="add-player-search"
						type="text"
						class="search-input"
						placeholder="Поиск игрока..."
						bind:value={searchQuery}
					/>
				</span>
			</div>

			<div class="form-group">
				<label for="add-player-select">Игрок</label>
				<span class="select-wrap">
					<select id="add-player-select" bind:value={selectedUid}>
						<option value="">Выберите игрока</option>
						{#each availablePlayers as player}
							<option value={player.uid}>{player.name}</option>
						{/each}
					</select>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
				</span>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<button
				class="btn-common btn-play"
				class:btn-loading={isAdding}
				disabled={!selectedUid}
				onclick={handleAdd}>Добавить</button
			>
		</div>
	</div>
{/if}

<style>
	.add-player-card {
		width: 420px;
		max-width: 90vw;
		padding: 20px 26px 26px;
		gap: 14px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.popup-title {
		font-size: 16px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 11.5px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.search-wrap {
		position: relative;
		display: block;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding-left: 28px;
	}

	.select-wrap {
		position: relative;
		display: block;
	}

	.select-wrap select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		padding-right: 32px;
	}

	.select-arrow {
		position: absolute;
		right: 11px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-dim);
		pointer-events: none;
	}
</style>
