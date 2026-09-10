import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { apiPost } from './api'

// Firebase Auth stays the identity provider (see zzz-league-server's migration plan) — everything
// else has moved to backend.ts against ZenlessLeague.Api. What's left here is genuinely
// auth-adjacent: signInWithCustomToken-based login and Discord OAuth linking.
const firebaseConfig = {
	apiKey: "AIzaSyAlcnUiLJ1cq7ekCQFi_NOPAQ6UiG92ZqM",
	databaseURL: "https://zzz-league-default-rtdb.firebaseio.com",
	projectId: "zzz-league"
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Login via Discord OAuth, against ZenlessLeague.Api rather than a Firebase Function — the new
// backend mints the Firebase custom token itself (see Features/Auth/AuthService.cs). Auto-creates
// a Player if this Discord id hasn't been seen before.
export async function loginWithDiscord(code: string, redirectUri: string): Promise<void> {
	const { token } = await apiPost<{ token: string }>('/api/auth/discord/login', { code, redirectUri });
	await signInWithCustomToken(auth, token);
}

export async function linkDiscord(code: string, redirectUri: string): Promise<void> {
	await apiPost('/api/players/me/discord/link', { code, redirectUri });
}

export async function unlinkDiscord(): Promise<void> {
	await apiPost('/api/players/me/discord/unlink');
}
