<script lang="ts">
	import { deleteTeam } from "$lib/backend";
	import { currentUser, isAdmin, playersByUid } from "$lib/store";
	import type { Team } from "$lib/types";
	import { bustCache, dateDisplayOptions, openProfilePopup } from "$lib/uiCommon";

	let {
		open = $bindable(false),
		team = null,
		onEdit = undefined,
		onDeleted = undefined,
	}: {
		open?: boolean;
		team?: Team | null;
		onEdit?: (team: Team) => void;
		onDeleted?: (teamId: string) => void;
	} = $props();

	// Only the team's two players (or an admin) may edit/delete — mirrors the backend's
	// PUT/DELETE /api/teams/{id} membership check.
	let isMember = $derived(
		!!$currentUser &&
			!!team &&
			($currentUser.uid === team.creator.uid || $currentUser.uid === team.player2.uid),
	);
	let canEdit = $derived(isMember || $isAdmin);

	let deleting = $state(false);

	function openMemberProfile(uid: string) {
		const player = $playersByUid.get(uid);
		if (player) openProfilePopup(player);
	}

	async function handleDelete() {
		if (deleting || !team) return;
		if (!confirm(`Удалить команду "${team.name}"? Это действие необратимо.`)) return;
		deleting = true;
		try {
			await deleteTeam(team.id);
			onDeleted?.(team.id);
			open = false;
		} catch (error: any) {
			alert(error.message);
		} finally {
			deleting = false;
		}
	}
</script>

{#if open && team}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card" onclick={(e) => e.stopPropagation()}>
			{#if team.photoUrl}
				<img class="team-logo" src={bustCache(team.photoUrl)} alt={team.name} />
			{/if}
			<h2>{team.name}</h2>
			<div class="form-row">
				<label for="team-details-p1">Игрок 1</label>
				<button
					id="team-details-p1"
					class="member-link"
					onclick={() => openMemberProfile(team!.creator.uid)}>{team.creator.name}</button
				>
			</div>
			<div class="form-row">
				<label for="team-details-p2">Игрок 2</label>
				<button
					id="team-details-p2"
					class="member-link"
					onclick={() => openMemberProfile(team!.player2.uid)}>{team.player2.name}</button
				>
			</div>
			<p class="notice">
				Создана {new Date(team.createdAt).toLocaleString("ru", dateDisplayOptions)}
			</p>

			<div class="btn-row">
				{#if canEdit}
					<button class="btn-common" onclick={() => onEdit?.(team!)}>Изменить</button>
					<button
						class="btn-common danger"
						class:btn-loading={deleting}
						onclick={handleDelete}>Удалить</button
					>
				{/if}
				<button class="btn-common" onclick={() => (open = false)}>Закрыть</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.team-logo {
		width: 96px;
		height: 96px;
		object-fit: cover;
		border-radius: 8px;
		align-self: center;
	}

	.member-link {
		all: unset;
		cursor: pointer;
		font-weight: bold;
		text-decoration: underline transparent;
		transition: color 0.15s;
	}

	.member-link:hover {
		color: var(--gold);
		text-decoration-color: currentColor;
	}
</style>
