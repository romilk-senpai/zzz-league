<script lang="ts">
	import { getAgentAvatar } from "$lib/agentAvatars";
	import AvatarPickerPopup from "$lib/components/AvatarPickerPopup.svelte";
	import { openDiscordOAuth } from "$lib/discord";
	import { auth, unlinkDiscord } from "$lib/firebase";
	import { updateProfile } from "$lib/backend";
	import { currentUser, refreshCurrentUser } from "$lib/store";
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
	let email = $state(auth.currentUser?.email ?? "");
	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPass = $state("");
	let status = $state("");
	let savingSettings = $state(false);
	let unlinkingDiscord = $state(false);
	let avatarPickerOpen = $state(false);

	function close() {
		currentPassword = "";
		newPassword = "";
		confirmPass = "";
		status = "";
		closeSettingsPopup();
	}

	async function handleLinkDiscord() {
		try {
			openDiscordOAuth();
		} catch (error: any) {
			status = error.message;
		}
	}

	async function handleUnlinkDiscord() {
		if (unlinkingDiscord) return;
		unlinkingDiscord = true;
		try {
			await unlinkDiscord();
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
					status = "Пароли не совпадают";
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
					await updateProfile(user.uid, newUsername);
					await refreshCurrentUser(user.uid);
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
	<div class="card" onclick={(e) => e.stopPropagation()}>
		<h2>Настройки аккаунта</h2>
		<button
			type="button"
			class="avatar-preview"
			onclick={() => (avatarPickerOpen = true)}
		>
			{#if selectedAvatar}
				<img src={selectedAvatar.src} alt={selectedAvatar.name} />
			{:else}
				<span class="avatar-placeholder">?</span>
			{/if}
		</button>
		<div class="form-row">
			<label for="settings-email">Email</label>
			<input
				id="settings-email"
				class="input-disabled"
				type="email"
				bind:value={email}
				placeholder="Email"
				disabled
			/>
		</div>
		<div class="form-row">
			<label for="settings-username">Ник</label>
			<input
				id="settings-username"
				type="text"
				bind:value={username}
				placeholder="Ник"
			/>
		</div>
		<div class="form-row">
			<label for="settings-discord">Discord</label>
			<input
				id="settings-discord"
				type="text"
				class="input-disabled"
				value={user.discordUsername ?? ""}
				placeholder="Discord"
				disabled
			/>
		</div>
		{#if user.discordId}
			<button
				class="btn-common"
				class:btn-loading={unlinkingDiscord}
				disabled={unlinkingDiscord}
				onclick={() => handleUnlinkDiscord()}>Отвязать Discord</button
			>
		{:else}
			<button class="btn-common" onclick={() => handleLinkDiscord()}
				>Привязать Discord</button
			>
		{/if}
		<br />
		<div class="form-row">
			<label for="settings-current-password">Текущий пароль</label>
			<input
				id="settings-current-password"
				type="password"
				bind:value={currentPassword}
				placeholder="Текущий пароль"
			/>
		</div>
		<div class="form-row">
			<label for="settings-new-password">Новый пароль</label>
			<input
				id="settings-new-password"
				type="password"
				bind:value={newPassword}
				placeholder="Новый пароль"
			/>
		</div>
		<div class="form-row">
			<label for="settings-confirm-password">Подтвердите пароль</label>
			<input
				id="settings-confirm-password"
				type="password"
				bind:value={confirmPass}
				placeholder="Подтвердите пароль"
			/>
		</div>
		<br />
		{#if status}<p class="status error">{status}</p>{/if}
		<div class="btn-row">
			<button
				class="btn-common btn-play"
				class:btn-loading={savingSettings}
				onclick={() => handleSaveSettings()}>Сохранить</button
			>
			<button class="btn-common" onclick={() => close()}>Закрыть</button>
		</div>
	</div>
</div>

<AvatarPickerPopup bind:open={avatarPickerOpen} selected={user.avatar} />

<style>
	.avatar-preview {
		display: block;
		width: 72px;
		height: 72px;
		margin: 0 auto 10px;
		padding: 0;
		border-radius: 50%;
		border: 2px solid #444;
		background: #222;
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
		color: #888;
		font-size: 24px;
	}
</style>
