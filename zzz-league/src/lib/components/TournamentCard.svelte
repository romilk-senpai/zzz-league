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
	<p class="tournament-name">{tournament.name}</p>
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
</a>

<style>
	.tournament {
		--accent: var(--border);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		min-width: 0;
		font-size: 13px;
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
		transform: translateY(-2px);
		border-color: var(--accent);
	}

	.tournament-name {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
	}

	.tournament-dates {
		color: var(--text-muted);
		font-size: 11.5px;
	}

	.tournament.compact {
		gap: 10px;
		padding: 16px 18px;
		background: var(--surface-2);
		border-radius: var(--r-md);
		border-left-width: 3px;
	}

	.tournament.compact .tournament-name {
		font-size: 14px;
	}

	.tournament.compact .tournament-dates {
		font-size: 12px;
		color: var(--text-dim);
	}

	.tournament.compact.status-ended .tournament-status {
		background: var(--surface-hover);
	}

	.tournament-status {
		align-self: flex-start;
		margin-top: 2px;
		padding: 3px 9px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
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
