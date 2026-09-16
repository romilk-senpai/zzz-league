<script lang="ts">
	import { deletePlayer, updatePlayerElo } from "$lib/backend";
	import { _ } from "$lib/i18n";
	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import { isAdmin } from "$lib/store";
	import type { Player, PlayerListItem } from "$lib/types";
	import { getLvl, getTier, openProfilePopup } from "$lib/uiCommon";
	import PointsDelta from "$lib/components/PointsDelta.svelte";

	const INACTIVITY_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

	// Also fed archived season snapshots (ArchivedPlayerSnapshot) from the home page's archive
	// viewer — those lack tournamentPoints/lastPlayedTournamentTimestamp (and may have a null uid,
	// for archives predating the snapshot's player FK), so every field but name/elo/tier flags is
	// optional here.
	type LeaderboardPlayer = {
		uid?: string | null;
		name: string;
		elo: number;
		avatar?: string | null;
		tournamentPoints?: number;
		isMidConfirmed: boolean;
		isHighConfirmed: boolean;
		lastPlayedTournamentTimestamp?: number;
	};

	interface Props {
		players?: LeaderboardPlayer[];
		hideOptions?: boolean;
		searchQuery?: string;
		showInactivePlayers?: boolean;
		// Live (non-archived) admin edits need the caller to patch its own player list — this
		// component no longer owns any shared player state itself. Unused when hideOptions is true.
		onPlayerUpdated?: (player: Player) => void;
		onPlayerDeleted?: (uid: string) => void;
	}

	let {
		players = [],
		hideOptions = false,
		searchQuery = "",
		showInactivePlayers = false,
		onPlayerUpdated = undefined,
		onPlayerDeleted = undefined,
	}: Props = $props();

	function isActive(p: LeaderboardPlayer) {
		// Archived snapshots (hideOptions=true) are a frozen point-in-time view — activity
		// filtering only makes sense for the live leaderboard.
		if (hideOptions) return true;
		return (
			!!p.lastPlayedTournamentTimestamp &&
			Date.now() - p.lastPlayedTournamentTimestamp < INACTIVITY_THRESHOLD_MS
		);
	}

	let sortedPlayers = $derived(
		[...players]
			.filter((p) => p?.name)
			.filter((p) => showInactivePlayers || isActive(p))
			.sort((a, b) => (b.elo || 1000) - (a.elo || 1000)),
	);

	let filteredPlayers = $derived(
		[...sortedPlayers].filter(
			(p) =>
				!searchQuery ||
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	async function handleUpdatePlayerElo(uid: string, currentElo: number) {
		const val = prompt($_("leaderboard.newEloPrompt"), String(currentElo));
		if (!val) return;
		const elo = parseInt(val);
		if (isNaN(elo)) return;
		try {
			onPlayerUpdated?.(await updatePlayerElo(uid, elo));
		} catch (e: any) {
			alert(e.message);
		}
	}

	async function handleDelete(uid: string) {
		if (!confirm($_("leaderboard.confirmDeletePlayer"))) return;
		try {
			await deletePlayer(uid);
			onPlayerDeleted?.(uid);
		} catch (e: any) {
			alert(e.message);
		}
	}

	function handleNameClick(player: LeaderboardPlayer) {
		if (player.uid) openProfilePopup(player as PlayerListItem);
	}

	function getLadderPos(p: LeaderboardPlayer) {
		return sortedPlayers.indexOf(p);
	}

	const rankClass = ["rank-1", "rank-2", "rank-3"];
</script>

<table>
	<thead>
		<tr>
			<th>{$_("leaderboard.rankColumn")}</th>
			<th>{$_("leaderboard.tierColumn")}</th>
			<th>{$_("leaderboard.playerColumn")}</th>
			<th class="align-right">ELO</th>
			<th class="align-right">LVL</th>
			{#if $isAdmin && !hideOptions}<th class="align-right">{$_("leaderboard.optionsColumn")}</th>{/if}
		</tr>
	</thead>
	<tbody>
		{#each filteredPlayers as player, index}
			{@const elo = player.elo || 1000}
			{@const tier = getTier(player)}
			{@const ladderPos = getLadderPos(player)}
			{@const avatar = getAgentAvatar(player.avatar)}

			<tr
				class={[
					ladderPos < 3 ? `top-${ladderPos + 1}` : "",
					!isActive(player) ? "inactive" : "",
				]
					.filter(Boolean)
					.join(" ")}
			>
				<td>{index + 1}</td>
				<td><span class="tier-badge {tier.cls}">{tier.name}</span></td>
				<td class="player-name">
					<div class="player-cell">
						<div
							class="player-avatar {ladderPos < 3 ? rankClass[ladderPos] : ''}"
							style="background-image: {avatar ? 'none' : `url(${avatarPlaceholder})`}"
						>
							{#if avatar}
								<img src={avatar.src} alt={avatar.name} />
							{/if}
						</div>
						<button
							class="hover-emphasis"
							disabled={!player.uid}
							onclick={() => handleNameClick(player)}>{player.name}</button
						>
					</div>
				</td>
				<td class="align-right">
					<PointsDelta points={player.tournamentPoints ?? 0} />
					<b>{elo}</b>
				</td>
				<td class="align-right"><span class="lvl-badge">L{getLvl(elo)}</span></td>
				{#if $isAdmin && !hideOptions}
					<td class="options-cell">
						<button
							class="icon-btn"
							aria-label={$_("leaderboard.editEloAriaLabel")}
							onclick={() => handleUpdatePlayerElo(player.uid!, elo)}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
						</button>
						<button
							class="icon-btn danger"
							aria-label={$_("leaderboard.deletePlayerAriaLabel")}
							onclick={() => handleDelete(player.uid!)}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.player-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.player-avatar {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background-color: var(--surface-2);
		background-size: cover;
		background-position: center;
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.player-avatar.rank-1 {
		border: 1.5px solid var(--gold);
		color: var(--gold);
	}

	.player-avatar.rank-2 {
		border: 1.5px solid var(--rank-silver);
		color: var(--rank-silver);
	}

	.player-avatar.rank-3 {
		border: 1.5px solid var(--rank-bronze);
		color: var(--rank-bronze);
	}

	.player-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.options-cell {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
	}

	.align-right {
		text-align: right;
	}

	td.align-right b {
		font-variant-numeric: tabular-nums;
	}
</style>
