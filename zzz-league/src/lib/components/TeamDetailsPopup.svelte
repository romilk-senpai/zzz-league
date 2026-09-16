<script lang="ts">
	import { deleteTeam, listPlayers } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import { currentUser, isAdmin } from "$lib/store";
	import type { PlayerListItem, Team } from "$lib/types";
	import { bustCache, openProfilePopup } from "$lib/uiCommon";

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

	// Team.creator/player2 are the lean PlayerSummary shape (uid/name/avatar/tier only) — not
	// enough for the full profile popup, so fetch the two members' full list-item data on open.
	let membersByUid = $state<Map<string, PlayerListItem>>(new Map());

	$effect(() => {
		if (open && team) {
			listPlayers([team.creator.uid, team.player2.uid]).then((loaded) => {
				membersByUid = new Map(loaded.map((p) => [p.uid, p]));
			});
		}
	});

	function openMemberProfile(uid: string) {
		const player = membersByUid.get(uid);
		if (player) openProfilePopup(player);
	}

	async function handleDelete() {
		if (deleting || !team) return;
		if (
			!confirm(
				$_("teamDetailsPopup.confirmDelete", { values: { name: team.name } }),
			)
		)
			return;
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

	function teamInitials(name: string): string {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}
</script>

{#if open && team}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card team-details-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label={$_("common.close")}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			{#if team.photoUrl}
				<img class="team-logo" src={bustCache(team.photoUrl)} alt={team.name} />
			{:else}
				<span class="team-logo placeholder">{teamInitials(team.name)}</span>
			{/if}
			<h2 class="popup-title">{team.name}</h2>

			<div class="member-list">
				<button class="member-chip" onclick={() => openMemberProfile(team!.creator.uid)}>
					<span class="member-label">{$_("teamDetailsPopup.player1Label")}</span>
					<span class="member-name">{team.creator.name}</span>
				</button>
				<button class="member-chip" onclick={() => openMemberProfile(team!.player2.uid)}>
					<span class="member-label">{$_("teamDetailsPopup.player2Label")}</span>
					<span class="member-name">{team.player2.name}</span>
				</button>
			</div>

			{#if canEdit}
				<div class="btn-row">
					<button class="btn-common" onclick={() => onEdit?.(team!)}>{$_("common.edit")}</button>
					<button
						class="btn-common btn-danger-ghost"
						class:btn-loading={deleting}
						onclick={handleDelete}>{$_("common.delete")}</button
					>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.team-details-card {
		width: 400px;
		max-width: 90vw;
		padding: 20px 26px 26px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.close-row {
		width: 100%;
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.team-logo {
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: var(--r-md);
	}

	.team-logo.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-hover);
		color: var(--text-muted);
		font-weight: 700;
		font-size: 18px;
	}

	.popup-title {
		font-size: 18px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
		display: block;
		text-align: center;
	}

	.member-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.member-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		height: auto;
		padding: 9px 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.15s;
	}

	.member-chip:hover {
		border-color: var(--gold);
	}

	.member-label {
		font-size: 11px;
		color: var(--text-dim);
	}

	.member-name {
		font-weight: 700;
		color: var(--text);
	}

	.btn-row {
		width: 100%;
		margin-top: 4px;
	}
</style>
