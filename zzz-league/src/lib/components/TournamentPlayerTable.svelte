<script lang="ts">
	import { approveRegistration } from "$lib/backend";
	import { isAdmin, isModerator } from "$lib/store";
	import type { RegisteredPlayer, Tournament } from "$lib/types";
	import { hasTournamentStarted } from "$lib/tournamentState";
	import { getLvl, getTier, openProfilePopup } from "$lib/uiCommon";
	import PointsDelta from "$lib/components/PointsDelta.svelte";
	import { _ } from "$lib/i18n";

	interface Props {
		registrations: RegisteredPlayer[];
		tournament?: Tournament;
		hideOptions: boolean;
		searchQuery: string;
		onViewRegistration?: (uid: string) => void;
	}

	let {
		registrations: registrations = [],
		hideOptions = false,
		searchQuery = "",
		tournament = undefined,
		onViewRegistration = undefined,
	}: Props = $props();

	let sortedRegs = $derived(
		[...registrations]
			.filter((p) => p.player.name)
			.sort(
				(a, b) =>
					a.registration.registrationTimestamp -
					b.registration.registrationTimestamp,
			),
	);

	let filteredRegs = $derived(
		[...sortedRegs].filter(
			(p) =>
				!searchQuery ||
				p.player.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	async function handleApprove(registrationId: string, approved: boolean) {
		approveRegistration(tournament!.id, registrationId, !approved);
	}

	let canViewRegistrations = $derived(
		$isAdmin || $isModerator || hasTournamentStarted(tournament?.state),
	);
</script>

<table>
	<thead>
		<tr>
			<th>{$_("tournamentPlayerTable.numberColumn")}</th>
			<th>{$_("tournamentPlayerTable.tierColumn")}</th>
			<th>{$_("tournamentPlayerTable.playerColumn")}</th>
			<th>{$_("tournamentPlayerTable.eloColumn")}</th>
			<th>{$_("tournamentPlayerTable.lvlColumn")}</th>
			<th>{$_("tournamentPlayerTable.confirmedColumn")}</th>
			{#if canViewRegistrations}<th>{$_("tournamentPlayerTable.registrationColumn")}</th>{/if}
			{#if $isAdmin && !hideOptions}<th>{$_("tournamentPlayerTable.optionsColumn")}</th>{/if}
		</tr>
	</thead>
	<tbody>
		{#each filteredRegs as reg, index}
			{@const elo = reg.player.elo || 1000}
			{@const tier = getTier(reg.player)}
			<tr>
				<td>{index + 1}</td>
				<td><span class="tier-badge {tier.cls}">{tier.name}</span></td>
				<td class="player-name">
					<button
						class="hover-emphasis"
						onclick={() => openProfilePopup(reg.player)}
						>{reg.player.name}</button
					>
				</td>
				<td>
					<b>{elo}</b>
					<PointsDelta points={reg.player.tournamentPoints} />
				</td>
				<td><span class="lvl-badge">L{getLvl(elo)}</span></td>
				<td class="approved-cell {reg.registration.approved ? 'approved' : 'declined'}">
					{#if reg.registration.approved}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
					{:else}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					{/if}
				</td>
				{#if canViewRegistrations}
					<td>
						<button
							class="btn-common btn-view"
							onclick={() => onViewRegistration?.(reg.player.uid)}
							>{$_("tournamentPlayerTable.viewButton")}</button
						>
					</td>
				{/if}
				{#if $isAdmin && !hideOptions}
					<td class="options-cell">
						<button
							class="icon-btn"
							onclick={() =>
								handleApprove(
									reg.registration.id,
									reg.registration.approved,
								)}>⚙️</button
						>
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.approved-cell {
		text-align: center;
	}

	.approved-cell.approved {
		color: var(--success);
	}

	.approved-cell.declined {
		color: var(--danger);
	}

	.btn-view {
		height: 26px;
		padding: 0 10px;
		font-size: 11px;
	}
</style>
