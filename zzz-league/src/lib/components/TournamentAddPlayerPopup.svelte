<script lang="ts">
	import { adminAddTournamentRegistration } from "$lib/firebase";
	import { players } from "$lib/store";
	import type { Player } from "$lib/types";

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

	let availablePlayers = $derived(
		$players.filter(
			(p: Player) =>
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
		<div class="card" onclick={(e) => e.stopPropagation()}>
			<h2>Добавить игрока</h2>
			<div class="form-row">
				<label for="add-player-search">Поиск игрока</label>
				<input
					id="add-player-search"
					type="text"
					class="search-input"
					placeholder="Поиск игрока..."
					bind:value={searchQuery}
				/>
			</div>
			<div class="form-row">
				<label for="add-player-select">Игрок</label>
				<select id="add-player-select" bind:value={selectedUid}>
					<option value="">Выберите игрока</option>
					{#each availablePlayers as player}
						<option value={player.uid}>{player.name}</option>
					{/each}
				</select>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<div class="btn-row">
				<button
					class="btn-common btn-play"
					class:btn-loading={isAdding}
					disabled={!selectedUid}
					onclick={handleAdd}>Добавить</button
				>
				<button class="btn-common" onclick={() => (open = false)}
					>Закрыть</button
				>
			</div>
		</div>
	</div>
{/if}
