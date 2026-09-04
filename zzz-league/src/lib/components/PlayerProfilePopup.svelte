<script lang="ts">
	import { resolve } from "$app/paths";
	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import { isAdmin } from "$lib/store";
	import type { Player } from "$lib/types";
	import { closeProfilePopup, getTier } from "$lib/uiCommon";
	import PointsDelta from "$lib/components/PointsDelta.svelte";

	let { player = null }: { player?: Player | null } = $props();

	let avatar = $derived(getAgentAvatar(player?.avatar));

	let copiedField = $state<string | null>(null);
	async function copyToClipboard(text: string, field: string) {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copiedField = field;
			setTimeout(() => {
				if (copiedField === field) copiedField = null;
			}, 1500);
		} catch {}
	}

	let stats = $derived.by(() => {
		const wins = player?.wins ?? 0;
		const losses = player?.losses ?? 0;
		const total = wins + losses;
		return {
			wins,
			losses,
			total,
			winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={closeProfilePopup}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card profile-card" onclick={(e) => e.stopPropagation()}>
		{#if !player}
			<h1>Игрок не найден</h1>
		{:else}
			{@const tier = getTier(player)}

			{#snippet copyIcon()}
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M17.5 14H19C20.1046 14 21 13.1046 21 12V5C21 3.89543 20.1046 3 19 3H12C10.8954 3 10 3.89543 10 5V6.5M5 10H12C13.1046 10 14 10.8954 14 12V19C14 20.1046 13.1046 21 12 21H5C3.89543 21 3 20.1046 3 19V12C3 10.8954 3.89543 10 5 10Z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{/snippet}

			<div class="profile-header">
				<span
					class="avatar-wrap"
					style="background-image: url({avatarPlaceholder})"
				>
					{#if avatar}
						<img class="profile-avatar" src={avatar.src} alt={avatar.name} />
					{/if}
				</span>
				<div class="profile-header-info">
					<div class="profile-name-row">
						<h1 id="profName">{player.name}</h1>
						<span class="tier-badge {tier.cls}">{tier.name}</span>
					</div>
					<button
						type="button"
						class="info-card"
						class:copied={copiedField === "discord"}
						disabled={!player.discord}
						onclick={() => copyToClipboard(player.discord, "discord")}
						title="Скопировать"
					>
						<span class="info-label">Discord</span>
						<span class="info-value">{player.discord ?? "-"}</span>
						{#if copiedField === "discord"}
							<span class="copied-label">Скопировано</span>
						{/if}
						<span class="copy-icon">{@render copyIcon()}</span>
					</button>
					{#if $isAdmin}
						<button
							type="button"
							class="info-card"
							class:copied={copiedField === "uid"}
							onclick={() => copyToClipboard(player.uid, "uid")}
							title="Скопировать"
						>
							<span class="info-label">UID</span>
							<span class="info-value">{player.uid}</span>
							{#if copiedField === "uid"}
								<span class="copied-label">Скопировано</span>
							{/if}
							<span class="copy-icon">{@render copyIcon()}</span>
						</button>
					{/if}
				</div>
			</div>

			<div class="stat-grid">
				<div class="stat-item elo-item">
					<div class="stat-label">ELO</div>
					<div id="elo" class="stat-value gold">
						{player.elo ?? 1000}
						<PointsDelta
							points={player.tournamentPoints}
							tag="span"
							class="points"
						/>
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Сыграно игр</div>
					<div id="totalGames" class="stat-value">{stats.total}</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Винрейт</div>
					<div id="winRate" class="stat-value winrate">
						{stats.winRate}%
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Победы</div>
					<div id="wins" class="stat-value gain">{stats.wins}</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Поражения</div>
					<div id="losses" class="stat-value loss">{stats.losses}</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Сыграно турниров</div>
					<div id="tournamentCount" class="stat-value">
						{player.playedTournamentCount ?? 0}
					</div>
				</div>
				<div class="stat-item">
					<div class="stat-label">Турниров в сезоне</div>
					<div id="seasonalTournamentCount" class="stat-value">
						{player.seasonalPlayedTournamentCount ?? 0}
					</div>
				</div>
			</div>

			<a
				class="btn-common btn-history"
				href={resolve(`/history/${player.uid}`)}
				onclick={closeProfilePopup}
			>
				История матчей
			</a>

			<button class="btn-common back-btn" onclick={closeProfilePopup}
				>← Закрыть</button
			>
		{/if}
	</div>
</div>

<style>
	.profile-card {
		width: 480px;
		text-align: center;
	}

	.profile-header {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 16px;
		text-align: left;
	}

	.avatar-wrap {
		flex-shrink: 0;
		width: 96px;
		height: 96px;
		border-radius: 50%;
		border: 2px solid #444;
		background-size: cover;
		background-position: center;
		overflow: hidden;
	}

	.profile-avatar {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.profile-header-info {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
		min-width: 0;
		flex: 1;
	}

	.profile-name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.profile-name-row h1 {
		margin-bottom: 0;
		font-size: 20px;
	}

	.info-card {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		background: #222;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid #333;
		font-size: 13px;
		cursor: pointer;
		transition: 0.15s;
	}

	.info-card:hover {
		border-color: #555;
		background: #272727;
	}

	.info-card:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.info-label {
		flex-shrink: 0;
		color: #888;
		font-size: 12px;
	}

	.info-value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: left;
		color: #ddd;
	}

	.copied-label {
		flex-shrink: 0;
		color: var(--gold);
		font-size: 12px;
		white-space: nowrap;
	}

	.copy-icon {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #888;
		transition: 0.15s;
	}

	.info-card:hover .copy-icon,
	.info-card.copied .copy-icon {
		color: var(--gold);
	}

	.btn-history {
		margin-top: 8px;
	}

	.stat-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 16px;
	}

	.stat-item {
		flex: 1 1 130px;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		background: #222;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid #333;
	}

	.elo-item {
		flex-basis: 100%;
	}

	.stat-label {
		color: #9f9f9f;
		/* text-transform: uppercase; */
	}

	.stat-value {
		font-weight: bold;
		font-size: 18px;
	}

	.winrate {
		color: #2eb82e;
	}

	.gold {
		color: var(--gold);
	}
</style>
