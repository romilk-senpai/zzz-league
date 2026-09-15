<script lang="ts">
	import { auth } from "$lib/firebase";
	import { openDiscordOAuth } from "$lib/discord";
	import { closeLoginPopup } from "$lib/uiCommon";
	import {
		sendPasswordResetEmail,
		signInWithEmailAndPassword,
	} from "firebase/auth";

	function handleDiscordLogin() {
		openDiscordOAuth("login");
	}

	let email = $state("");
	let password = $state("");
	let status = $state("");
	let resettingPassword = $state(false);
	let loggingIn = $state(false);

	async function handleLogin() {
		if (loggingIn) return;
		status = "";
		try {
			loggingIn = true;
			await signInWithEmailAndPassword(auth, email, password);
			close();
		} catch (error: any) {
			status = error.message;
		} finally {
			loggingIn = false;
		}
	}

	function close() {
		email = "";
		password = "";
		closeLoginPopup();
	}

	async function handleResetPassword() {
		try {
			await sendPasswordResetEmail(auth, email);
			status = "Проверьте почту (спам в том числе)";
		} catch (error: any) {
			status = error.message;
		}
	}

	function resetPassword() {
		resettingPassword = true;
		status = "";
	}

	function backFromReset() {
		resettingPassword = false;
		status = "";
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popup" onclick={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card login-card" onclick={(e) => e.stopPropagation()}>
		<div class="close-row">
			<button class="icon-btn" onclick={close} aria-label="Закрыть">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>

		{#if resettingPassword}
			<h1 class="popup-title">Сброс пароля</h1>
			<div class="field-group">
				<label for="login-reset-email">Email</label>
				<input
					id="login-reset-email"
					type="text"
					bind:value={email}
					placeholder="Email"
				/>
			</div>

			{#if status}<p class="status error">{status}</p>{/if}
			<button
				class="btn-common btn-play"
				onclick={() => handleResetPassword()}>Отправить код</button
			>
			<button class="btn-reset-password" onclick={() => backFromReset()}
				>← Назад ко входу</button
			>
		{:else}
			<h1 class="popup-title">Вход</h1>
			<button class="btn-common btn-discord" onclick={handleDiscordLogin}>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7362 19.7362 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
				Войти через Discord
			</button>
			<p class="login-divider">или по email</p>
			<div class="field-group">
				<label for="login-email">Email</label>
				<input
					id="login-email"
					type="text"
					bind:value={email}
					placeholder="Email"
				/>
			</div>
			<div class="field-group">
				<label for="login-password">Пароль</label>
				<input
					id="login-password"
					type="password"
					bind:value={password}
					placeholder="Пароль"
					onkeydown={(e) => e.key === "Enter" && handleLogin()}
				/>
			</div>
			{#if status}<p class="status error">{status}</p>{/if}
			<button
				class="btn-common btn-play"
				class:btn-loading={loggingIn}
				onclick={handleLogin}
				>Войти</button
			>
			<button class="btn-reset-password" onclick={resetPassword}
				>Забыли пароль?</button
			>
		{/if}
	</div>
</div>

<style>
	.login-card {
		width: 380px;
		padding: 20px 26px 26px;
		gap: 14px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -10px;
	}

	.popup-title {
		font-size: 18px;
		font-weight: 800;
		text-align: center;
		margin-bottom: 0;
	}

	.btn-discord {
		background: oklch(0.56 0.16 280);
		color: #fff;
		border-color: oklch(0.56 0.16 280);
	}

	.btn-discord:hover {
		background: oklch(0.62 0.16 280);
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}
</style>
