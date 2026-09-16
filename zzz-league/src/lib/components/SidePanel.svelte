<script lang="ts">
	import {
		openLoginPopup,
		openProfilePopup,
		openSettingsPopup,
	} from "$lib/uiCommon";

	import { getAgentAvatar } from "$lib/agentAvatars";
	import avatarPlaceholder from "$lib/assets/avatar-placeholder.webp";
	import { auth } from "$lib/firebase";
	import { signOut } from "firebase/auth";
	import AdminPanel from "./AdminPanel.svelte";
	import { currentUser, isAdmin } from "$lib/store";
	import { resolve } from "$app/paths";
	import { _ } from "$lib/i18n";

	let avatar = $derived(getAgentAvatar($currentUser?.avatar));
</script>

<div class="side-panel">
	{#if !$currentUser}
		<div class="card">
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={openLoginPopup}
					>{$_("sidePanel.login")}</button
				>
			</div>
		</div>
	{:else}
		<div class="card">
			<button
				class="user-label"
				onclick={() => openProfilePopup($currentUser)}
			>
				<span
					class="avatar-wrap"
					style="background-image: {avatar ? 'none' : `url(${avatarPlaceholder})`}"
				>
					{#if avatar}
						<img class="user-avatar" src={avatar.src} alt={avatar.name} />
					{/if}
				</span>
				<span class="user-name">{$currentUser.name}</span>
			</button>
			<div class="divider"></div>
			<div class="nav-list">
				<button class="nav-item" onclick={openSettingsPopup}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
					{$_("sidePanel.settings")}
				</button>
				<a class="nav-item" href={resolve("/teams/mine")}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					{$_("sidePanel.myTeams")}
				</a>
				<a class="nav-item" href={resolve(`/history/${$currentUser.uid}`)}>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
					{$_("sidePanel.myHistory")}
				</a>
			</div>
			<div class="divider"></div>
			<button class="nav-item nav-item-danger" onclick={() => signOut(auth)}>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
				{$_("sidePanel.logout")}
			</button>
		</div>
	{/if}

	{#if !$isAdmin}
		<div class="card">
			<h2>{$_("sidePanel.leagueCodeTitle")}</h2>
			<ul class="rules-list">
				<li>{@html $_("sidePanel.rules.ranks")}</li>
				<li>{@html $_("sidePanel.rules.qualification")}</li>
				<li>{@html $_("sidePanel.rules.levels")}</li>
				<li>{@html $_("sidePanel.rules.tournamentBonus")}</li>
				<li>{@html $_("sidePanel.rules.finalTournament")}</li>
				<li>{@html $_("sidePanel.rules.leagueReset")}</li>
				<li>{@html $_("sidePanel.rules.seasons")}</li>
				<li>{@html $_("sidePanel.rules.elimination")}</li>
				<li>{@html $_("sidePanel.rules.eloPoints")}</li>
				<li>{@html $_("sidePanel.rules.techLoss")}</li>
			</ul>
		</div>
	{/if}

	{#if $isAdmin}
		<AdminPanel />
	{/if}
</div>

<style>
	.side-panel {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.user-label {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
	}

	.user-name {
		flex: 1;
		font-weight: 700;
		font-size: 14px;
		line-height: 1.3;
		text-align: left;
	}

	.avatar-wrap {
		flex-shrink: 0;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 2px solid var(--border);
		background-size: cover;
		background-position: center;
		overflow: hidden;
	}

	.user-avatar {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
		margin: 14px 0;
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		border-radius: var(--r-md);
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: 0.15s;
	}

	.nav-item:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.nav-item-danger {
		color: var(--danger);
	}

	.rules-list {
		padding-left: 18px;
		margin: 0;
		font-size: 12px;
		line-height: 1.55;
		color: var(--text-muted);
	}

	.rules-list li {
		margin-bottom: 13px;
	}

	.rules-list li:last-child {
		margin-bottom: 0;
	}

	.rules-list li::marker {
		color: var(--gold);
	}

	.rules-list :global(b) {
		color: var(--text);
	}
</style>
