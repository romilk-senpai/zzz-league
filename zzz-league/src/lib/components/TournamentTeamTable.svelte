<script lang="ts">
	import { approveRegistration } from "$lib/backend";
	import { isAdmin, isModerator } from "$lib/store";
	import type { PlayerListItem, Team, Tournament, TournamentRegistration } from "$lib/types";
	import { hasTournamentStarted } from "$lib/tournamentState";
	import { getTier } from "$lib/uiCommon";

	interface Props {
		registrations: TournamentRegistration[]; // team-shaped (teamId set) only
		teamsById: Map<string, Team>;
		playersData: PlayerListItem[];
		tournament?: Tournament;
		hideOptions: boolean;
		searchQuery: string;
		onViewTeam?: (teamId: string) => void;
		onViewRegistration?: (teamId: string) => void;
	}

	let {
		registrations = [],
		teamsById,
		playersData,
		hideOptions = false,
		searchQuery = "",
		tournament = undefined,
		onViewTeam = undefined,
		onViewRegistration = undefined,
	}: Props = $props();

	// Rows for a team whose members haven't loaded yet (or whose Team itself hasn't resolved into
	// teamsById yet) are dropped until they have.
	let rows = $derived(
		registrations.flatMap((registration) => {
			const team = registration.teamId ? teamsById.get(registration.teamId) : undefined;
			if (!team) return [];

			const p1 = playersData.find((p) => p.uid === team.creator.uid);
			const p2 = playersData.find((p) => p.uid === team.player2.uid);
			if (!p1 || !p2) return [];

			const tier1 = getTier(p1);
			const tier2 = getTier(p2);
			const label = `${team.name} (${team.creator.name} + ${team.player2.name})`;

			return [{ team, registration, tier1, tier2, label }];
		}),
	);

	let sortedRows = $derived(
		[...rows].sort(
			(a, b) => a.registration.registrationTimestamp - b.registration.registrationTimestamp,
		),
	);

	let filteredRows = $derived(
		sortedRows.filter((r) => !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase())),
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
			<th>№</th>
			<th>Тир</th>
			<th>Команда</th>
			<th>Подтвержден</th>
			{#if canViewRegistrations}<th>Рега</th>{/if}
			{#if $isAdmin && !hideOptions}<th>Опции</th>{/if}
		</tr>
	</thead>
	<tbody>
		{#each filteredRows as row, index}
			<tr>
				<td>{index + 1}</td>
				<td>
					<span class="tier-badge {row.tier1.cls}">{row.tier1.name}</span>
					<span class="tier-badge {row.tier2.cls}">{row.tier2.name}</span>
				</td>
				<td class="player-name">
					<button
						class="hover-emphasis team-name-btn"
						onclick={() => onViewTeam?.(row.team.id)}>{row.label}</button
					>
				</td>
				<td><span>{row.registration.approved ? "✅" : "❌"}</span></td>
				{#if canViewRegistrations}
					<td>
						<button
							class="icon-btn hover-emphasis"
							onclick={() => onViewRegistration?.(row.team.id)}
							>Смотреть</button
						>
					</td>
				{/if}
				{#if $isAdmin && !hideOptions}
					<td class="options-cell">
						<button
							class="icon-btn"
							onclick={() =>
								handleApprove(
									row.registration.id,
									row.registration.approved,
								)}>⚙️</button
						>
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.team-name-btn {
		display: inline-block;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: bottom;
	}
</style>
