// This app is a Firebase/SignalR-backed SPA (adapter-static with an SPA fallback) — every
// data source (auth, Firestore, SignalR) is client-only, so SSR only renders an empty shell
// and can leave locale-dependent {@html} content stuck at the server's default locale.
export const ssr = false;
