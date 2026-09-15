<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import SidePanel from "$lib/components/SidePanel.svelte";
	import { getTournament, listPlayers, listRegistrations, splitTournament } from "$lib/backend";
	import { isAdmin } from "$lib/store";
	import type { Tournament } from "$lib/types";
	import { isLocked } from "$lib/tournamentState";
	import { onMount, untrack } from "svelte";

	const id = $derived(page.params.id!);

	type PoolPlayer = { uid: string; name: string };

	let loaded = $state(false);
	let loadError = $state("");
	let tournament = $state<Tournament>();

	let approvedPlayers = $state<PoolPlayer[]>([]);
	let divisionCount = $state(2);
	let divisionSizes = $state<number[]>([2, 2]);
	let groups = $state<string[][]>([[], []]);

	let assignedUids = $derived(new Set(groups.flat()));
	let pool = $derived(approvedPlayers.filter((p) => !assignedUids.has(p.uid)));

	let maxDivisionCount = $derived(
		Math.max(2, Math.floor(approvedPlayers.length / 2)),
	);
	let canSplit = $derived(loaded && approvedPlayers.length >= 4);

	$effect(() => {
		const n = Math.max(2, divisionCount || 0);
		if (divisionSizes.length < n) {
			divisionSizes = [
				...divisionSizes,
				...Array(n - divisionSizes.length).fill(2),
			];
			groups = [
				...groups,
				...Array.from({ length: n - groups.length }, () => []),
			];
		} else if (divisionSizes.length > n) {
			divisionSizes = divisionSizes.slice(0, n);
			groups = groups.slice(0, n);
		}
	});

	$effect(() => {
		const max = maxDivisionCount;
		untrack(() => {
			if (divisionCount > max) {
				divisionCount = max;
			}
		});
	});

	function clampDivisionCount() {
		if (!Number.isFinite(divisionCount) || divisionCount < 2) {
			divisionCount = 2;
		} else if (divisionCount > maxDivisionCount) {
			divisionCount = maxDivisionCount;
		}
	}

	function clampDivisionSize(i: number) {
		if (!Number.isFinite(divisionSizes[i]) || divisionSizes[i] < 2) {
			divisionSizes[i] = 2;
		}
	}

	let validationError = $derived.by(() => {
		if (!canSplit) {
			return `Недостаточно одобренных игроков для разделения (нужно минимум 4, сейчас ${approvedPlayers.length})`;
		}
		if (!Number.isFinite(divisionCount) || divisionCount < 2) {
			return "Должно быть минимум 2 сетки";
		}
		if (divisionCount > maxDivisionCount) {
			return `Слишком много сеток: максимум ${maxDivisionCount} при ${approvedPlayers.length} игроках`;
		}
		const smallIndex = divisionSizes.findIndex(
			(n) => !Number.isFinite(n) || n < 2,
		);
		if (smallIndex !== -1) {
			return `В сетке ${smallIndex + 1} должно быть минимум 2 игрока`;
		}
		if (pool.length > 0) {
			return `Не все игроки распределены (осталось ${pool.length})`;
		}
		const mismatchIndex = groups.findIndex(
			(g, i) => g.length !== divisionSizes[i],
		);
		if (mismatchIndex !== -1) {
			return `В сетке ${mismatchIndex + 1} распределено ${groups[mismatchIndex].length} игроков, а задано ${divisionSizes[mismatchIndex]}`;
		}
		return null;
	});

	function shufflePlayers() {
		const shuffled = [...approvedPlayers];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		const next: string[][] = [];
		let offset = 0;
		for (const size of divisionSizes) {
			next.push(shuffled.slice(offset, offset + size).map((p) => p.uid));
			offset += size;
		}
		groups = next;
	}

	let draggedUid = $state<string | null>(null);

	function handleDragStart(uid: string) {
		draggedUid = uid;
	}

	function handleDragEnd() {
		draggedUid = null;
	}

	function removeFromGroups(uid: string) {
		return groups.map((g) => g.filter((u) => u !== uid));
	}

	function isDivisionFull(index: number) {
		return groups[index].length >= divisionSizes[index];
	}

	function canDropOnDivision(index: number) {
		if (!draggedUid) return false;
		if (groups[index].includes(draggedUid)) return true;
		return !isDivisionFull(index);
	}

	function moveToDivision(index: number) {
		if (!canDropOnDivision(index)) return;
		const uid = draggedUid!;
		const next = removeFromGroups(uid);
		next[index] = [...next[index], uid];
		groups = next;
		draggedUid = null;
	}

	function moveToPool() {
		if (!draggedUid) return;
		groups = removeFromGroups(draggedUid);
		draggedUid = null;
	}

	onMount(async () => {
		try {
			const data = await getTournament(id);
			if (!data) {
				loadError = "Турнир не найден.";
				return;
			}
			if (isLocked(data.state) || data.challongeTournamentId) {
				loadError = "Турнир уже начался, разделение недоступно.";
				return;
			}
			if (data.divisionGroupId) {
				loadError = "Турнир уже разделён на сетки.";
				return;
			}
			tournament = data;

			const registrations = await listRegistrations(id);
			const approvedUids = registrations
				.filter((r) => r.approved && r.playerId)
				.map((r) => r.playerId!);
			const namesByUid = new Map(
				(await listPlayers(approvedUids)).map((p) => [p.uid, p.name]),
			);

			approvedPlayers = approvedUids.map((uid) => ({
				uid,
				name: namesByUid.get(uid) ?? uid,
			}));
		} catch (e: any) {
			loadError = e.message;
		} finally {
			loaded = true;
		}
	});

	let status = $state("");
	let isSplitting = $state(false);
	async function handleSplit() {
		if (isSplitting) return;
		if (validationError) {
			status = validationError;
			return;
		}
		if (!confirm(`Разделить турнир на ${divisionCount} сетки?`)) return;

		isSplitting = true;
		try {
			await splitTournament(id, groups);
			await goto(resolve(`/tournaments/${id}`));
		} catch (e: any) {
			status = e.message;
		} finally {
			isSplitting = false;
		}
	}
</script>

<div class="layout">
	<SidePanel></SidePanel>

	<div class="card main-content">
		{#if !$isAdmin}
			<p class="notice">Недостаточно прав для просмотра этой страницы.</p>
		{:else if !loaded}
			<h2>Разделить на сетки</h2>
			<p class="notice">Загрузка...</p>
		{:else if loadError}
			<h2 class="page-title">Разделить на сетки</h2>
			<p class="notice">{loadError}</p>
		{:else}
			<h2 class="page-title">
				Разделить турнир «{tournament?.name}» на сетки — отменить нельзя
			</h2>

			{#if !canSplit}
				<p class="notice">
					Недостаточно одобренных игроков для разделения (нужно минимум 4,
					сейчас {approvedPlayers.length}).
				</p>
				<div class="btn-row narrow">
					<a class="btn-common" href={resolve(`/tournaments/${id}`)}
						>Назад</a
					>
				</div>
			{:else}
				<div class="split-toolbar">
					<div class="field-group">
						<label for="division-count">Количество сеток</label>
						<input
							id="division-count"
							class="count-field"
							type="number"
							min="2"
							max={maxDivisionCount}
							bind:value={divisionCount}
							onblur={clampDivisionCount}
						/>
					</div>
					<p class="hint">Максимум сеток: {maxDivisionCount}</p>
					<p class="hint">
						Распределено: {approvedPlayers.length - pool.length} / {approvedPlayers.length}
					</p>
					<button class="btn-common shuffle-btn" onclick={shufflePlayers}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
						Перемешать
					</button>
				</div>

				<div class="split-columns">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="split-column pool-column"
						ondragover={(e) => e.preventDefault()}
						ondrop={moveToPool}
					>
						<h3>Не распределены ({pool.length})</h3>
						<div class="player-list">
							{#each pool as player (player.uid)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="player-card"
									draggable="true"
									ondragstart={() => handleDragStart(player.uid)}
									ondragend={handleDragEnd}
								>
									{player.name}
								</div>
							{/each}
						</div>
					</div>

					{#each groups as group, i}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="split-column"
							class:division-full={isDivisionFull(i)}
							ondragover={(e) => {
								if (canDropOnDivision(i)) e.preventDefault();
							}}
							ondrop={() => moveToDivision(i)}
						>
							<h3 class:division-full={isDivisionFull(i)}>
								Сетка {i + 1}
							</h3>
							<div class="field-group">
								<label for="division-size-{i}">Игроков</label>
								<input
									id="division-size-{i}"
									class="size-field"
									type="number"
									min="2"
									bind:value={divisionSizes[i]}
									onblur={() => clampDivisionSize(i)}
								/>
							</div>
							<p class="hint" class:division-full={isDivisionFull(i)}>
								Распределено: {group.length} / {divisionSizes[i]}
							</p>
							<div class="player-list">
								{#each group as uid (uid)}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="player-card"
										draggable="true"
										ondragstart={() => handleDragStart(uid)}
										ondragend={handleDragEnd}
									>
										{approvedPlayers.find((p) => p.uid === uid)
											?.name ?? uid}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<p class="hint">
					Перетащите игроков между колонками для распределения.
				</p>

				{#if status}<p class="status error">{status}</p>{/if}
				<div class="btn-row narrow">
					<button
						class="btn-common btn-play"
						class:btn-loading={isSplitting}
						onclick={handleSplit}>Разделить</button
					>
					<a class="btn-common" href={resolve(`/tournaments/${id}`)}
						>Отмена</a
					>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.main-content {
		padding: 24px 28px;
		gap: 18px;
	}

	.page-title {
		font-size: 20px;
		padding-bottom: 16px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-group label {
		font-size: 12px;
		color: var(--text-dim);
		font-weight: 600;
	}

	.count-field {
		width: 80px;
	}

	.size-field {
		width: 60px;
	}

	.split-toolbar {
		display: flex;
		align-items: flex-end;
		gap: 24px;
		flex-wrap: wrap;
	}

	.shuffle-btn {
		margin-left: auto;
	}

	.split-columns {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		width: 100%;
	}

	.split-column {
		flex: 1 1 200px;
		min-width: 190px;
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.split-column h3 {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-muted);
		margin: 0;
		border: none;
		padding: 0;
		display: block;
	}

	.division-full {
		border-color: var(--success);
	}

	h3.division-full {
		color: var(--success);
	}

	p.division-full {
		color: var(--success);
	}

	.pool-column {
		border-style: dashed;
	}

	.player-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 40px;
	}

	.player-card {
		padding: 8px 10px;
		border-radius: var(--r-sm);
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		font-size: 12px;
		font-weight: 500;
		cursor: grab;
	}

	.player-card:active {
		cursor: grabbing;
	}

	.hint {
		color: var(--text-dim);
		font-size: 12px;
		margin: 0;
	}

	.btn-row.narrow {
		max-width: 420px;
	}
</style>
