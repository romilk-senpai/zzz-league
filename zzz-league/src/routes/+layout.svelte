<script lang="ts">
	import "../app.css";

	import {
		profileUser,
		settingsOpen,
		loginOpen,
		currentUser,
		role,
		viewingImage,
		refreshCurrentUser,
		refreshTournaments,
		refreshOneTournament,
	} from "$lib/store";

	import LoginPopup from "$lib/components/LoginPopup.svelte";
	import PlayerProfilePopup from "$lib/components/PlayerProfilePopup.svelte";
	import SettingsPopup from "$lib/components/SettingsPopup.svelte";
	import { onMount } from "svelte";
	import { onAuthStateChanged } from "firebase/auth";
	import { auth } from "$lib/firebase";
	import { connectIfAuthenticated, disconnect, onTournamentChanged } from "$lib/signalr";
	import ImageViwerPopup from "$lib/components/ImageViwerPopup.svelte";
	import SiteHeader from "$lib/components/Header.svelte";
	import favicon from "$lib/assets/favicon.png";

	let { children } = $props();

	let profileOpen = $state(false);
	let imageViewerOpen = $state(false);

	$effect(() => {
		profileOpen = $profileUser !== null;
		imageViewerOpen = !!$viewingImage;
	});

	onMount(() => {
		const unsubAuth = onAuthStateChanged(auth, async (user) => {
			if (user) {
				await refreshCurrentUser(user.uid);
				await connectIfAuthenticated();
			} else {
				$currentUser = null;
				$role = "player";
				await disconnect();
			}
		});

		refreshTournaments();

		// Every client is auto-joined to the hub's list group (see TournamentHub), so this covers
		// the home page / tournament archive lists without a per-tournament subscription.
		const unsubTournamentChanged = onTournamentChanged((tournamentId) => {
			refreshOneTournament(tournamentId);
		});

		return () => {
			unsubAuth();
			unsubTournamentChanged();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SiteHeader />

{@render children()}

{#if $loginOpen}<LoginPopup />{/if}
{#if $settingsOpen}<SettingsPopup />{/if}
{#if profileOpen}<PlayerProfilePopup player={$profileUser} />{/if}
{#if imageViewerOpen}<ImageViwerPopup src={$viewingImage} />{/if}
