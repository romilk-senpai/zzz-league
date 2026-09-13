// Thin wrapper around the TournamentHub connection (see zzz-league-server's TournamentNotifier).
// The hub only ever pushes "X changed" signals with ids — handlers are expected to re-fetch the
// affected resource via backend.ts, not read data off the hub payload itself.
//
// The hub requires an authenticated connection (RequireAuthorization in Program.cs), so anonymous
// visitors can't get a token for it — connectIfAuthenticated()/disconnect() (driven by the root
// layout's onAuthStateChanged) make that a graceful no-op instead of a failed negotiate/console
// error: anonymous users still see REST-fetched data, they just don't get live pushes.
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from './api';
import { auth } from './firebase';

let connection: signalR.HubConnection | null = null;

// Tournament-scoped groups the app currently wants to be in. The list group (see
// onTournamentChanged etc.) is auto-rejoined for free after a reconnect because it's joined
// server-side on every connect (TournamentHub.OnConnectedAsync) — but a tournament-scoped
// JoinTournament call is client-invoked, tied to the old connection id, and silently lost on
// reconnect otherwise. Tracked here (not per-caller) so any future caller gets the same
// rejoin-on-reconnect behavior for free.
const joinedTournamentIds = new Set<string>();

function getConnection(): signalR.HubConnection {
	if (connection) return connection;

	connection = new signalR.HubConnectionBuilder()
		.withUrl(`${API_BASE_URL}/hubs/tournaments`, {
			// Auth is a Bearer token (accessTokenFactory below), not cookies — the API's CORS
			// policy doesn't set AllowCredentials, so this must stay false or the browser blocks
			// the negotiate request's preflight.
			withCredentials: false,
			accessTokenFactory: async () => {
				await auth.authStateReady();
				const user = auth.currentUser;
				return user ? await user.getIdToken() : '';
			},
		})
		.withAutomaticReconnect()
		.build();

	connection.onreconnected(async () => {
		for (const tournamentId of joinedTournamentIds) {
			try {
				await connection!.invoke('JoinTournament', tournamentId);
			} catch (error) {
				console.error('Failed to rejoin tournament group after reconnect', tournamentId, error);
			}
		}
	});

	return connection;
}

export async function connectIfAuthenticated(): Promise<void> {
	await auth.authStateReady();
	if (!auth.currentUser) return;
	const conn = getConnection();
	if (conn.state !== signalR.HubConnectionState.Disconnected) return;
	try {
		await conn.start();
	} catch (error) {
		console.error('SignalR connection failed', error);
	}
}

export async function disconnect(): Promise<void> {
	if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
		await connection.stop();
	}
	// A stopped connection won't fire onreconnected, but clear this anyway so a later logout/login
	// cycle's fresh connect doesn't carry over stale group membership from the previous session.
	joinedTournamentIds.clear();
}

function isConnected(): boolean {
	return connection?.state === signalR.HubConnectionState.Connected;
}

// Every client is auto-joined to the list group on connect (see TournamentHub.OnConnectedAsync) —
// this just subscribes to the events, no join call needed for list-level updates. Registering a
// handler before the connection exists/starts is safe — SignalR just won't have anything to
// deliver until (if ever) it connects.
export function onTournamentChanged(handler: (tournamentId: string) => void): () => void {
	const conn = getConnection();
	conn.on('TournamentChanged', handler);
	return () => conn.off('TournamentChanged', handler);
}

export function onRegistrationChanged(handler: (tournamentId: string, registrationId: string) => void): () => void {
	const conn = getConnection();
	conn.on('RegistrationChanged', handler);
	return () => conn.off('RegistrationChanged', handler);
}

export function onMatchChanged(handler: (tournamentId: string, matchId: string) => void): () => void {
	const conn = getConnection();
	conn.on('MatchChanged', handler);
	return () => conn.off('MatchChanged', handler);
}

export function onMatchesSynced(handler: (tournamentId: string) => void): () => void {
	const conn = getConnection();
	conn.on('MatchesSynced', handler);
	return () => conn.off('MatchesSynced', handler);
}

// Join/leave the tournament-scoped group for a specific tournament page's live updates
// (registration/match changes) — the list group above is separate and always-on. No-ops for
// anonymous visitors (never connected) instead of hanging.
export async function joinTournamentGroup(tournamentId: string): Promise<void> {
	await auth.authStateReady();
	if (!auth.currentUser) return;
	const conn = getConnection();
	await connectIfAuthenticated();
	// Tracked regardless of whether we're connected right now (e.g. mid-reconnect) — a pending
	// connect/reconnect will pick this up, either via the initial join below once connected, or
	// via the onreconnected rejoin loop above.
	joinedTournamentIds.add(tournamentId);
	if (conn.state === signalR.HubConnectionState.Connected) {
		await conn.invoke('JoinTournament', tournamentId);
	}
}

export async function leaveTournamentGroup(tournamentId: string): Promise<void> {
	joinedTournamentIds.delete(tournamentId);
	if (isConnected()) {
		await connection!.invoke('LeaveTournament', tournamentId);
	}
}
