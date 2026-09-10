import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Firebase Auth stays the identity provider (see zzz-league-server's migration plan) — everything
// else has moved to backend.ts against ZenlessLeague.Api. What's left here is genuinely
// auth-adjacent and explicitly out of scope for that migration: account creation (tied to
// signInWithCustomToken) and Discord OAuth linking.
const firebaseConfig = {
	apiKey: "AIzaSyAlcnUiLJ1cq7ekCQFi_NOPAQ6UiG92ZqM",
	databaseURL: "https://zzz-league-default-rtdb.firebaseio.com",
	projectId: "zzz-league"
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
const functions = getFunctions(app, "europe-west1");

export async function registerUser(
	username: string,
	email: string,
	password: string,
): Promise<void> {
	const fn = httpsCallable(functions, 'register');
	const result = await fn({ username, email, password }) as any;
	await signInWithCustomToken(auth, result.data.token);
}

export async function linkDiscord(code: string, redirectUri: string): Promise<void> {
	await httpsCallable(functions, 'linkDiscord')({ code, redirectUri });
}

export async function unlinkDiscord(): Promise<void> {
	await httpsCallable(functions, 'unlinkDiscord')();
}
