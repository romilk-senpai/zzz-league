import { auth, linkDiscord, loginWithDiscord } from "./firebase"
import { applyPlayerUpdate } from "./store"

const DISCORD_CLIENT_ID = '1501228042926690486'

export type DiscordOAuthMode = 'login' | 'link';

export function openDiscordOAuth(mode: DiscordOAuthMode) {
	const redirectUri = `${window.location.origin}/zzz-league/discord-callback`

	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify',
		state: mode,
	})
	window.location.href = `https://discord.com/oauth2/authorize?${params}`
}

export async function handleDiscordCallback() {
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');
	if (!code) return;

	const redirectUri = `${window.location.origin}/zzz-league/discord-callback`
	const mode = params.get('state') as DiscordOAuthMode | null;

	if (mode === 'login') {
		await loginWithDiscord(code, redirectUri);
	} else {
		// This page is landed on via a full-page redirect back from Discord, so Firebase Auth's
		// session restore is still in flight at this point — auth.currentUser can read null for a
		// moment even though the user is genuinely logged in, which would send this request with
		// no Authorization header and get a 401. Wait for the initial auth state to settle first.
		await auth.authStateReady();
		applyPlayerUpdate(await linkDiscord(code, redirectUri));
	}
}