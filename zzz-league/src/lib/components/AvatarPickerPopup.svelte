<script lang="ts">
	import { agentAvatars } from "$lib/agentAvatars";
	import { updateAvatar } from "$lib/firebase";

	let {
		open = $bindable(false),
		selected = undefined,
	}: {
		open?: boolean;
		selected?: string;
	} = $props();

	let searchQuery = $state("");
	// svelte-ignore state_referenced_locally
	let selectedId = $state(selected);
	let status = $state("");
	let saving = $state(false);

	$effect(() => {
		if (open) {
			selectedId = selected;
			status = "";
		}
	});

	let filteredAvatars = $derived(
		agentAvatars.filter((a) =>
			a.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	function close() {
		searchQuery = "";
		status = "";
		open = false;
	}

	async function handleSave() {
		if (saving || !selectedId || selectedId === selected) return;
		saving = true;
		status = "";
		try {
			await updateAvatar(selectedId);
			close();
		} catch (error: any) {
			status = error.message;
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card avatar-picker-card" onclick={(e) => e.stopPropagation()}>
			<h2>Выберите аватар</h2>
			<input
				class="search-input"
				placeholder="Поиск..."
				bind:value={searchQuery}
			/>
			<div class="avatar-grid">
				{#each filteredAvatars as agent (agent.id)}
					<button
						type="button"
						class="avatar-option"
						class:selected={selectedId === agent.id}
						onclick={() => (selectedId = agent.id)}
					>
						<img src={agent.src} alt={agent.name} />
						<span>{agent.name}</span>
					</button>
				{:else}
					<span class="no-results">Ничего не найдено</span>
				{/each}
			</div>
			{#if status}<p class="status error">{status}</p>{/if}
			<div class="btn-row">
				<button
					class="btn-common btn-play"
					class:btn-loading={saving}
					disabled={!selectedId || selectedId === selected}
					onclick={handleSave}>Сохранить</button
				>
				<button class="btn-common" onclick={close}>Закрыть</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.avatar-picker-card {
		width: 560px;
		max-width: 90vw;
	}

	.search-input {
		width: 100%;
	}

	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 12px;
		max-height: 50vh;
		overflow-y: auto;
		padding: 4px;
		width: 100%;
	}

	.avatar-option {
		background: #222;
		border: 2px solid transparent;
		border-radius: 8px;
		padding: 6px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		transition: 0.15s;
	}

	.avatar-option img {
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: 50%;
		display: block;
	}

	.avatar-option span {
		font-size: 11px;
		text-align: center;
		color: #ccc;
		line-height: 1.2;
	}

	.avatar-option:hover {
		border-color: #555;
	}

	.avatar-option.selected {
		border-color: var(--gold);
	}

	.no-results {
		grid-column: 1 / -1;
		text-align: center;
		color: #888;
		padding: 20px 0;
	}
</style>
