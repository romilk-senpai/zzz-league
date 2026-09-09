import { auth } from './firebase';

// Local dev only for now — ZenlessLeague.Api isn't deployed anywhere yet.
// Will need to become environment-specific once it is (see zzz-league-server's migration plan).
const API_BASE_URL = 'http://localhost:5158';

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set('Content-Type', 'application/json');

	// Firebase ID tokens are the new API's only auth mechanism (JWT bearer) — unlike
	// httpsCallable, plain fetch doesn't attach this automatically.
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
