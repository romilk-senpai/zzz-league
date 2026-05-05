import { linkDiscord } from "./firebase"

const DISCORD_CLIENT_ID = '1501228042926690486'

export function openDiscordOAuth() {
	const redirectUri = `${window.location.origin}/zzz-league/discord-callback`

	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify'
	})
	window.location.href = `https://discord.com/oauth2/authorize?${params}`
}

export async function handleDiscordCallback() {
	const code = new URLSearchParams(window.location.search).get('code');
	if (!code) return;

	const redirectUri = `${window.location.origin}/zzz-league/discord-callback`
	await linkDiscord(code, redirectUri);
}