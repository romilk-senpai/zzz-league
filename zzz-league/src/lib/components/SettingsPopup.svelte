<script lang="ts">
	import { getAgentAvatar } from "$lib/agentAvatars";
	import AvatarPickerPopup from "$lib/components/AvatarPickerPopup.svelte";
	import { _ } from "$lib/i18n";
	import { openDiscordOAuth } from "$lib/discord";
	import { auth, unlinkDiscord } from "$lib/firebase";
	import { updateProfile } from "$lib/backend";
	import { applyPlayerUpdate, currentUser } from "$lib/store";
	import { closeSettingsPopup } from "$lib/uiCommon";
	import {
		EmailAuthProvider,
		reauthenticateWithCredential,
		updatePassword,
	} from "firebase/auth";

	let user = $derived($currentUser!);
	let selectedAvatar = $derived(getAgentAvatar(user.avatar));

	// svelte-ignore state_referenced_locally
	let username = $state(user.name);
	let email = $state("");
	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPass = $state("");
	let status = $state("");
	let savingSettings = $state(false);
	let unlinkingDiscord = $state(false);
	let avatarPickerOpen = $state(false);

	$effect(() => {
		auth.authStateReady().then(() => {
			email = auth.currentUser?.email ?? "";
		});
	});

	function close() {
		currentPassword = "";
		newPassword = "";
		confirmPass = "";
		status = "";
		closeSettingsPopup();
	}

	async function handleLinkDiscord() {
		try {
			openDiscordOAuth('link');
		} catch (error: any) {
			status = error.message;
		}
	}

	async function handleUnlinkDiscord() {
		if (unlinkingDiscord) return;
		unlinkingDiscord = true;
		try {
			applyPlayerUpdate(await unlinkDiscord());
		} catch (error: any) {
			status = error.message;
		} finally {
			unlinkingDiscord = false;
		}
	}

	async function handleSaveSettings() {
		if (savingSettings) return;
		savingSettings = true;
		try {
			let successPw = false;

			if (newPassword.length > 0) {
				if (newPassword !== confirmPass) {
					status = $_("settingsPopup.passwordsMismatch");
					return;
				}

				try {
					const credential = EmailAuthProvider.credential(
						auth.currentUser!.email!,
						currentPassword,
					);

					await reauthenticateWithCredential(
						auth.currentUser!,
						credential,
					);
					await updatePassword(auth.currentUser!, newPassword);
					successPw = true;
				} catch (error: any) {
					status = error.message;
				}
			} else {
				successPw = true;
			}

			let successData = false;

			const newUsername = username !== user.name ? username : null;

			if (newUsername) {
				try {
					applyPlayerUpdate(await updateProfile(user.uid, newUsername));
					successData = true;
				} catch (error: any) {
					status = error.message;
				}
			} else {
				successData = true;
			}

			if (successPw && successData) {
				close();
			}
		} finally {
			savingSettings = false;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card settings-card" onclick={(e) => e.stopPropagation()}>
		<div class="close-row">
			<button class="icon-btn" onclick={close} aria-label={$_("common.close")}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
		<h2 class="popup-title">{$_("settingsPopup.title")}</h2>
		<button
			type="button"
			class="avatar-preview"
			onclick={() => (avatarPickerOpen = true)}
		>
			{#if selectedAvatar}
				<img src={selectedAvatar.srcLarge} alt={selectedAvatar.name} />
			{:else}
				<span class="avatar-placeholder">?</span>
			{/if}
		</button>
		<div class="avatar-hint">{$_("settingsPopup.avatarHint")}</div>

		<div class="settings-form-row">
			<div class="form-row">
				<label for="settings-email">{$_("settingsPopup.emailLabel")}</label>
				<input
					id="settings-email"
					class="input-disabled"
					type="email"
					bind:value={email}
					placeholder={$_("settingsPopup.emailLabel")}
					disabled
				/>
			</div>
			<div class="form-row">
				<label for="settings-username">{$_("settingsPopup.usernameLabel")}</label>
				<input
					id="settings-username"
					type="text"
					bind:value={username}
					placeholder={$_("settingsPopup.usernameLabel")}
				/>
			</div>
			<div class="form-row">
				<label for="settings-discord">{$_("settingsPopup.discordLabel")}</label>
				<input
					id="settings-discord"
					type="text"
					class="input-disabled"
					value={user.discordUsername ?? ""}
					placeholder={$_("settingsPopup.discordLabel")}
					disabled
				/>
			</div>
		</div>

		{#if user.discordId}
			<button
				class="btn-common"
				class:btn-loading={unlinkingDiscord}
				disabled={unlinkingDiscord}
				onclick={() => handleUnlinkDiscord()}>{$_("settingsPopup.unlinkDiscord")}</button
			>
		{:else}
			<button class="btn-common" onclick={() => handleLinkDiscord()}
				>{$_("settingsPopup.linkDiscord")}</button
			>
		{/if}

		<div class="divider"></div>

		<div class="settings-form-row">
			<div class="form-row">
				<label for="settings-current-password">{$_("settingsPopup.currentPasswordLabel")}</label>
				<input
					id="settings-current-password"
					type="password"
					bind:value={currentPassword}
					placeholder={$_("settingsPopup.currentPasswordLabel")}
				/>
			</div>
			<div class="form-row">
				<label for="settings-new-password">{$_("settingsPopup.newPasswordLabel")}</label>
				<input
					id="settings-new-password"
					type="password"
					bind:value={newPassword}
					placeholder={$_("settingsPopup.newPasswordLabel")}
				/>
			</div>
			<div class="form-row">
				<label for="settings-confirm-password">{$_("settingsPopup.confirmPasswordLabel")}</label>
				<input
					id="settings-confirm-password"
					type="password"
					bind:value={confirmPass}
					placeholder={$_("settingsPopup.confirmPasswordLabel")}
				/>
			</div>
		</div>

		{#if status}<p class="status error">{status}</p>{/if}
		<button
			class="btn-common btn-play"
			class:btn-loading={savingSettings}
			onclick={() => handleSaveSettings()}>{$_("common.save")}</button
		>
	</div>
</div>

<AvatarPickerPopup bind:open={avatarPickerOpen} selected={user.avatar} />

<style>
	.settings-card {
		width: 420px;
		padding: 20px 26px 26px;
		gap: 16px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -10px;
	}

	.popup-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		text-align: center;
		margin-bottom: 0;
		border: none;
		padding-bottom: 0;
	}

	.divider {
		height: 1px;
		background: var(--border-soft);
		margin: 4px 0;
	}

	.settings-form-row {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.form-row label {
		flex: 0 0 130px;
		color: var(--text-muted);
		font-size: 12px;
	}

	.form-row input {
		flex: 1;
		min-width: 0;
	}

	.avatar-preview {
		display: block;
		width: 76px;
		height: 76px;
		margin: 0 auto;
		padding: 0;
		border-radius: 50%;
		border: 2px solid var(--border);
		background: var(--surface-2);
		cursor: pointer;
		overflow: hidden;
		transition: 0.15s;
	}

	.avatar-preview:hover {
		border-color: var(--gold);
	}

	.avatar-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: var(--text-dim);
		font-size: 24px;
	}

	.avatar-hint {
		text-align: center;
		font-size: 11px;
		color: var(--text-dim);
		margin-top: -8px;
	}
</style>
