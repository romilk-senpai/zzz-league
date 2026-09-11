import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { apiPost } from './api'
import { toPlayer, type PlayerDto } from './backend'
import type { Player } from './types'

const firebaseConfig = {
	apiKey: "AIzaSyAlcnUiLJ1cq7ekCQFi_NOPAQ6UiG92ZqM",
	projectId: "zzz-league"
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export async function loginWithDiscord(code: string, redirectUri: string): Promise<void> {
	const { token } = await apiPost<{ token: string }>('/api/auth/discord/login', { code, redirectUri });
	await signInWithCustomToken(auth, token);
}

export async function linkDiscord(code: string, redirectUri: string): Promise<Player> {
	return toPlayer(await apiPost<PlayerDto>('/api/players/me/discord/link', { code, redirectUri }));
}

export async function unlinkDiscord(): Promise<Player> {
	return toPlayer(await apiPost<PlayerDto>('/api/players/me/discord/unlink'));
}
