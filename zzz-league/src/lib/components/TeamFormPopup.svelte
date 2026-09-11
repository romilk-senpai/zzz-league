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
		<div class="card" onclick={(e) => e.stopPropagation()}>
			<h2>{isEdit ? "Изменить команду" : "Создать команду"}</h2>
			<div class="form-row">
				<label for="team-name">Название</label>
				<input
					id="team-name"
					type="text"
					bind:value={name}
					placeholder="Название команды"
				/>
			</div>
			<div class="form-row">
				<label for="team-player2-search">Поиск напарника</label>
				<input
					id="team-player2-search"
					type="text"
					class="search-input"
					placeholder="Поиск..."
					bind:value={searchQuery}
				/>
			</div>
			<div class="form-row">
				<label for="team-player2-select">Напарник</label>
				<select id="team-player2-select" bind:value={selectedPlayer2Uid}>
					<option value="">Выберите игрока</option>
					{#each availablePlayers as player (player.uid)}
						<option value={player.uid}>{player.name}</option>
					{/each}
				</select>
			</div>
			<div class="form-row">
				<label for="team-photo">Логотип команды</label>
				<input id="team-photo" type="file" accept="image/*" bind:files={photoFile} />
			</div>
			{#if existingPhotoUrl && !photoPreview.url}
				<button class="img-btn logo-preview" onclick={() => openImagePopup(existingPhotoUrl)}>
					<img src={bustCache(existingPhotoUrl)} alt="" />
				</button>
				<p class="notice">Оставьте пустым, чтобы не менять логотип</p>
			{/if}
			{#if photoPreview.url}
				<button class="img-btn logo-preview" onclick={() => openImagePopup(photoPreview.url!)}>
					<img src={photoPreview.url} alt="" />
				</button>
			{/if}

			{#if status}<p class="status error">{status}</p>{/if}
			<div class="btn-row">
				<button
					class="btn-common btn-play"
					class:btn-loading={saving}
					disabled={!name.trim() || !selectedPlayer2Uid}
					onclick={handleSave}>Сохранить</button
				>
				<button class="btn-common" onclick={close}>Закрыть</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.logo-preview img {
		width: 96px;
		height: 96px;
		object-fit: cover;
		border-radius: 8px;
	}
</style>
