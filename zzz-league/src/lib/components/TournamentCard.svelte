<script lang="ts">
	import { resolve } from "$app/paths";
	import type { Tournament } from "$lib/types";
	import {
		TOURNAMENT_STATE,
		isRegistrationClosed,
		isRegistrationWindowOpen,
	} from "$lib/tournamentState";
	import { dateDisplayOptions } from "$lib/uiCommon";

	let {
		tournament,
		now,
		compact = false,
	}: { tournament: Tournament; now: number; compact?: boolean } = $props();

	let registrationWindowOpen = $derived(
		isRegistrationWindowOpen(
			tournament.state,
			tournament.registrationStartDate,
			tournament.registrationEndDate,
			now,
		),
	);

	let status = $derived(
		tournament.state === TOURNAMENT_STATE.COMPLETE
			? "ended"
			: tournament.state === TOURNAMENT_STATE.AWAITING_REVIEW ||
				  tournament.state === TOURNAMENT_STATE.STARTED
				? "ongoing"
				: registrationWindowOpen
					? "registration"
					: "upcoming",
	);
</script>

<a
	class="tournament status-{status}"
	class:compact
	href={resolve(`/tournaments/${tournament.id}`)}
>
	{#snippet tierBadge(tier: number)}
		{#if tier === 0}
			<span class="tier-badge t-newbie">NEWBIE</span>
		{:else if tier === 100}
			<span class="tier-badge t-mid">MID TIER</span>
		{:else if tier === 1000}
			<span class="tier-badge t-high">HIGH TIER</span>
		{/if}
	{/snippet}

	<div class="tournament-row">
		<p class="tournament-name">{tournament.name}</p>
		<span class="meta-tag">{tournament.registrationType === "team" ? "2x2" : "1x1"}</span>
	</div>
	<div class="tournament-row">
		<p class="tournament-dates">
			{new Date(tournament.tournamentStartDate).toLocaleString(
				"ru",
				dateDisplayOptions,
			)}
			- {new Date(tournament.tournamentEndDate).toLocaleString(
				"ru",
				dateDisplayOptions,
			)}
		</p>
		<span class="meta-tag"
			>{tournament.gameMode === "deadly_assault" ? "Deadly Assault" : "Shiyu Defense"}</span
		>
	</div>
	<div class="tournament-row">
		{#if registrationWindowOpen}
			<p class="tournament-status">
				Регистрация до {new Date(
					tournament.registrationEndDate,
				).toLocaleString("ru", dateDisplayOptions)}
			</p>
		{/if}
		{#if isRegistrationClosed(tournament.state)}
			<p class="tournament-status">
				Начало {new Date(tournament.tournamentStartDate).toLocaleString(
					"ru",
					dateDisplayOptions,
				)}
			</p>
		{/if}
		{#if tournament.state === TOURNAMENT_STATE.STARTED || tournament.state === TOURNAMENT_STATE.AWAITING_REVIEW}
			<p class="tournament-status">Турнир идёт</p>
		{/if}
		{#if tournament.state === TOURNAMENT_STATE.COMPLETE}
			<p class="tournament-status">Турнир окончен</p>
		{/if}
		<div class="tier-tags">
			{#if tournament.minTier === tournament.maxTier}
				{@render tierBadge(tournament.minTier)}
			{:else}
				{@render tierBadge(tournament.minTier)}<span class="tier-range-sep">–</span
				>{@render tierBadge(tournament.maxTier)}
			{/if}
		</div>
	</div>
</a>

<style>
	.tournament {
		--accent: var(--border);
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		font-size: 14px;
		text-align: left;
		padding: 14px 16px 14px 18px;
		background: var(--surface);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-lg);
		border-left-width: 4px;
		border-left-style: solid;
		border-left-color: var(--accent);
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.tournament:hover {
		border-color: var(--accent);
	}

	.tournament-row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.tournament-name {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tournament-dates {
		flex: 1;
		min-width: 0;
		color: var(--text-muted);
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta-tag {
		flex-shrink: 0;
		margin-left: auto;
		padding: 3px 8px;
		border-radius: var(--r-sm);
		font-size: 10px;
		font-weight: 700;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		color: var(--text-muted);
		white-space: nowrap;
	}

	.tier-tags {
		flex-shrink: 0;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tier-range-sep {
		color: var(--text-dim);
		font-size: 10px;
	}

	.tournament.compact {
		background: var(--surface-2);
		border-radius: var(--r-md);
		border-left-width: 3px;
	}

	.tournament.compact.status-ended .tournament-status {
		background: var(--surface-hover);
	}

	.tournament-status {
		min-width: 0;
		padding: 3px 9px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tournament.status-upcoming {
		--accent: var(--info);
	}

	.tournament.status-upcoming .tournament-status {
		background: var(--info-dim);
		color: var(--info);
	}

	.tournament.status-registration {
		--accent: var(--success);
	}

	.tournament.status-registration .tournament-status {
		background: var(--success-dim);
		color: var(--success);
	}

	.tournament.status-ongoing {
		--accent: var(--gold);
	}

	.tournament.status-ongoing .tournament-status {
		background: var(--gold-dim);
		color: var(--gold);
	}

	.tournament.status-ended {
		--accent: var(--border);
		opacity: 0.6;
	}

	.tournament.status-ended .tournament-status {
		background: var(--surface-2);
		color: var(--text-dim);
	}
</style>
