import { auth } from './firebase';

// Build-time override via Vite's standard `VITE_`-prefixed env vars (set `VITE_API_BASE_URL` in
// `.env`/`.env.production` locally, or as a build-time env var in CI) — falls back to the local
// dev API port so an unconfigured checkout still works unchanged.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5158';

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set('Content-Type', 'application/json');

	// Firebase ID tokens are the new API's only auth mechanism (JWT bearer) — unlike
	// httpsCallable, plain fetch doesn't attach this automatically. authStateReady() waits out
	// Firebase Auth's session restore on first load (auth.currentUser reads null for a moment
	// even when genuinely logged in); it resolves immediately once that's already settled, so
	// this costs nothing on every call after the first.
	await auth.authStateReady();
	const user = auth.currentUser;
	if (user) {
		headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
	}

	const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new ApiError(response.status, body?.error ?? response.statusText);
	}

	return response;
}

export async function apiGet<T>(path: string): Promise<T> {
	const response = await apiFetch(path);
	return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
	const response = await apiFetch(path, {
		method: 'POST',
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
	const response = await apiFetch(path, {
		method: 'PUT',
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export async function apiDelete(path: string): Promise<void> {
	await apiFetch(path, { method: 'DELETE' });
}
