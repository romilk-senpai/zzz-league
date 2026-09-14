<script lang="ts">
	import { createTeam, listPlayers, updateTeam } from "$lib/backend";
	import { useObjectUrlPreview } from "$lib/imagePreview.svelte.js";
	import { currentUser } from "$lib/store";
	import type { PlayerListItem, Team } from "$lib/types";
	import { bustCache, isImageTooLarge, MAX_IMAGE_SIZE_MB, openImagePopup } from "$lib/uiCommon";

	let {
		open = $bindable(false),
		team = null,
		onSaved = undefined,
	}: {
		open?: boolean;
		team?: Team | null;
		onSaved?: (team: Team) => void;
	} = $props();

	let isEdit = $derived(!!team);

	let name = $state("");
	let searchQuery = $state("");
	let selectedPlayer2Uid = $state("");
	let existingPhotoUrl = $state("");
	let photoFile = $state<FileList | null>(null);
	let status = $state("");
	let saving = $state(false);
	let players = $state<PlayerListItem[]>([]);

	let photoPreview = useObjectUrlPreview(() => photoFile?.[0]);
	// Native file input is visually hidden — "Выбрать логотип" triggers it programmatically so
	// the button can be styled like the rest of the design system instead of the OS-default input.
	let photoFileInput: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			name = team?.name ?? "";
			selectedPlayer2Uid = team?.player2.uid ?? "";
			existingPhotoUrl = team?.photoUrl ?? "";
			photoFile = null;
			searchQuery = "";
			status = "";
			listPlayers().then((loaded) => (players = loaded));
		}
	});

	let availablePlayers = $derived(
		players.filter(
			(p) =>
				p.uid !== $currentUser?.uid &&
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	function close() {
		open = false;
	}

	async function handleSave() {
		if (saving || !name.trim() || !selectedPlayer2Uid || !$currentUser) return;

		const photo = photoFile?.[0] ?? null;
		if (photo && isImageTooLarge(photo)) {
			status = `Файл слишком большой, максимум ${MAX_IMAGE_SIZE_MB}МБ`;
			return;
		}

		saving = true;
		status = "";
		try {
			const saved = isEdit
				? await updateTeam(team!.id, name.trim(), selectedPlayer2Uid, photo)
				: await createTeam($currentUser.uid, selectedPlayer2Uid, name.trim(), photo);
			onSaved?.(saved);
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
		<div class="card team-form-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={close} aria-label="Закрыть">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<h2 class="popup-title">{isEdit ? "Изменить команду" : "Создать команду"}</h2>

			<div class="logo-row">
				{#if photoPreview.url}
					<button
						class="logo-box has-image"
						onclick={() => openImagePopup(photoPreview.url!)}
					>
						<img src={photoPreview.url} alt="" />
					</button>
				{:else if existingPhotoUrl}
					<button
						class="logo-box has-image"
						onclick={() => openImagePopup(existingPhotoUrl)}
					>
						<img src={bustCache(existingPhotoUrl)} alt="" />
					</button>
				{:else}
					<span class="logo-box">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
					</span>
				{/if}
				<div class="logo-upload">
					<input
						bind:this={photoFileInput}
						class="hidden-file-input"
						id="team-photo"
						type="file"
						accept="image/*"
						bind:files={photoFile}
					/>
					<button
						type="button"
						class="btn-common"
						onclick={() => photoFileInput?.click()}>Выбрать логотип</button
					>
					{#if existingPhotoUrl && !photoPreview.url}
						<span class="logo-hint">Оставьте пустым, чтобы не менять логотип</span>
					{/if}
				</div>
			</div>

			<div class="form-group">
				<label for="team-name">Название</label>
				<input
					id="team-name"
					type="text"
					bind:value={name}
					placeholder="Название команды"
				/>
			</div>

			<div class="form-group">
				<label for="team-player2-search">Поиск напарника</label>
				<span class="search-wrap">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="search-icon"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input
						id="team-player2-search"
						type="text"
						class="search-input"
						placeholder="Поиск..."
						bind:value={searchQuery}
					/>
				</span>
			</div>

			<div class="form-group">
				<label for="team-player2-select">Напарник</label>
				<span class="select-wrap">
					<select id="team-player2-select" bind:value={selectedPlayer2Uid}>
						<option value="">Выберите игрока</option>
						{#each availablePlayers as player (player.uid)}
							<option value={player.uid}>{player.name}</option>
						{/each}
					</select>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-arrow"><polyline points="6 9 12 15 18 9"/></svg>
				</span>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<button
				class="btn-common btn-play btn-block"
				class:btn-loading={saving}
				disabled={!name.trim() || !selectedPlayer2Uid}
				onclick={handleSave}>Сохранить</button
			>
		</div>
	</div>
{/if}

<style>
	.team-form-card {
		width: 440px;
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

	.logo-row {
		display: flex;
		gap: 14px;
		align-items: center;
	}

	.logo-box {
		width: 64px;
		height: 64px;
		border-radius: var(--r-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		flex-shrink: 0;
		padding: 0;
		cursor: default;
	}

	.logo-box.has-image {
		cursor: pointer;
		overflow: hidden;
	}

	.logo-box img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.logo-upload {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.hidden-file-input {
		display: none;
	}

	.logo-hint {
		font-size: 11px;
		color: var(--text-dim);
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

	.btn-block {
		width: 100%;
		margin-top: 4px;
	}
</style>
