<script lang="ts">
	import { agentAvatars } from "$lib/agentAvatars";
	import { updateAvatar } from "$lib/backend";
	import { applyPlayerUpdate, currentUser } from "$lib/store";

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
		if (saving || !selectedId || selectedId === selected || !$currentUser) return;
		saving = true;
		status = "";
		try {
			applyPlayerUpdate(await updateAvatar($currentUser.uid, selectedId));
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
			<div class="close-row">
				<button class="icon-btn" onclick={close} aria-label="Закрыть">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<h2 class="popup-title">Выберите аватар</h2>
			<div class="form-group">
				<label for="avatar-search">Поиск аватара</label>
				<span class="search-wrap">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input
						id="avatar-search"
						class="search-input"
						placeholder="Поиск..."
						bind:value={searchQuery}
					/>
				</span>
			</div>
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
			<button
				class="btn-common btn-play"
				class:btn-loading={saving}
				disabled={!selectedId || selectedId === selected}
				onclick={handleSave}>Сохранить</button
			>
		</div>
	</div>
{/if}

<style>
	.avatar-picker-card {
		width: 560px;
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
		font-size: 12px;
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
		background: var(--surface-2);
		border: 2px solid transparent;
		border-radius: var(--r-md);
		padding: 8px 4px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		font-family: inherit;
		transition: 0.15s;
	}

	.avatar-option img {
		width: 52px;
		height: 52px;
		object-fit: cover;
		border-radius: 50%;
		display: block;
	}

	.avatar-option span {
		font-size: 10px;
		text-align: center;
		color: var(--text-muted);
		line-height: 1.2;
	}

	.avatar-option:hover {
		border-color: var(--border);
	}

	.avatar-option.selected {
		border-color: var(--gold);
		background: var(--gold-dim);
	}

	.no-results {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--text-dim);
		padding: 20px 0;
	}
</style>
