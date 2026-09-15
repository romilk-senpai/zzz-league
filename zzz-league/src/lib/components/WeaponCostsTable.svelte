<script lang="ts">
	import { agentCosts, specialties, type Specialty } from "$lib/costData";
	import { getAgentAvatar } from "$lib/agentAvatars";
	import { getWeaponAvatar } from "$lib/weaponAvatars";
	import { engineBaseRankLabels, engineRankLabels, weaponCosts, type WeaponCost } from "$lib/weaponData";
	import { contributionColor, contributions, type ContributionListItem } from "$lib/contributions";
	import ContributionMenu from "./ContributionMenu.svelte";
	import ContributionProposalPopup from "./ContributionProposalPopup.svelte";
	import ContributionReviewPopup from "./ContributionReviewPopup.svelte";

	let activeSpecialty = $state<Specialty>("attack");

	const activeInfo = $derived(specialties.find((s) => s.id === activeSpecialty)!);

	const allAgentOptions = $derived(
		$agentCosts
			.map((a) => ({ id: a.agentId, name: a.name ?? getAgentAvatar(a.agentId)?.name ?? a.agentId }))
			.sort((a, b) => a.name.localeCompare(b.name)),
	);

	function agentDisplay(agentId: string) {
		const avatar = getAgentAvatar(agentId);
		const found = $agentCosts.find((a) => a.agentId === agentId);
		return { name: found?.name ?? avatar?.name ?? agentId, avatarSrc: avatar?.src };
	}

	function maxScore(list: ContributionListItem[]): number | null {
		const pending = list.filter((c) => c.status === "pending");
		return pending.length ? Math.max(...pending.map((c) => c.score)) : null;
	}

	const pendingCountBySpecialty = $derived.by(() => {
		const counts: Partial<Record<Specialty, number>> = {};
		for (const c of $contributions) {
			if (c.status !== "pending" || !c.engineId) continue;
			const w = $weaponCosts.find((w) => w.engineId === c.engineId);
			if (!w) continue;
			counts[w.specialty] = (counts[w.specialty] ?? 0) + 1;
		}
		return counts;
	});

	function buildRow(w: WeaponCost) {
		const baseAll = $contributions.filter((c) => c.engineId === w.engineId && !c.overrideAgentId);
		const baseScore = maxScore(baseAll);

		const existingIds = new Set(w.agentOverrides.map((o) => o.agentId));
		const overrideRows = w.agentOverrides.map((o) => {
			const contribs = $contributions.filter(
				(c) => c.engineId === w.engineId && c.overrideAgentId === o.agentId,
			);
			return { agentId: o.agentId, costs: o.costs, contribs, pendingScore: maxScore(contribs), isNew: false };
		});

		const newAgentContribs = $contributions.filter(
			(c) =>
				c.engineId === w.engineId &&
				c.overrideAgentId &&
				!existingIds.has(c.overrideAgentId) &&
				c.status !== "rejected",
		);
		const newAgentIds = [...new Set(newAgentContribs.map((c) => c.overrideAgentId!))];
		const newRows = newAgentIds.map((agentId) => {
			const contribs = $contributions.filter((c) => c.engineId === w.engineId && c.overrideAgentId === agentId);
			const latest = [...contribs].sort((a, b) => b.createdAt - a.createdAt)[0];
			return {
				agentId,
				costs: latest.proposedCosts,
				contribs,
				pendingScore: maxScore(contribs),
				isNew: true,
			};
		});

		const coveredIds = new Set([...existingIds, ...newAgentIds]);
		const availableAgentOptions = allAgentOptions.filter((a) => !coveredIds.has(a.id));

		const allOverrideRows = [...overrideRows, ...newRows];
		const overridesPendingScore = maxScore(allOverrideRows.flatMap((o) => o.contribs));

		return {
			...w,
			avatar: getWeaponAvatar(w.engineId),
			baseAll,
			baseScore,
			overrideRows: allOverrideRows,
			overridesPendingScore,
			availableAgentOptions,
		};
	}

	const allWeaponRows = $derived($weaponCosts.map(buildRow));

	const rows = $derived(
		allWeaponRows
			.filter((w) => w.specialty === activeSpecialty)
			.sort((a, b) => b.rarity - a.rarity || b.baseCosts[0] - a.baseCosts[0]),
	);

	// Engine ids that actually have per-agent rows to collapse, across every specialty.
	const groupsWithOverrides = $derived(
		allWeaponRows.filter((w) => w.overrideRows.length > 0).map((w) => w.engineId),
	);

	let collapsedGroups = $state<Set<string>>(new Set());

	const allCollapsed = $derived(
		groupsWithOverrides.length > 0 && groupsWithOverrides.every((id) => collapsedGroups.has(id)),
	);

	function toggleGroup(engineId: string) {
		const next = new Set(collapsedGroups);
		if (next.has(engineId)) next.delete(engineId);
		else next.add(engineId);
		collapsedGroups = next;
	}

	function toggleAllGroups() {
		collapsedGroups = allCollapsed ? new Set() : new Set(groupsWithOverrides);
	}

	let menuOpen = $state(false);
	let menuTitle = $state("");
	let menuItems = $state<ContributionListItem[]>([]);
	let menuContext = $state<{
		engineId: string;
		weaponName: string;
		overrideAgentId?: string;
		agentDisplayName?: string;
		currentCosts: number[];
		rankLabels: string[];
	} | null>(null);

	let proposalOpen = $state(false);
	let proposalMode = $state<"engine-base" | "engine-agent">("engine-base");
	let proposalEngineId = $state("");
	let proposalWeaponName = $state("");
	let proposalAgentId = $state("");
	let proposalCurrentCosts = $state<number[]>([]);
	let proposalAgentOptions = $state<{ id: string; name: string }[]>([]);
	let proposalRankLabels = $state<string[]>(engineRankLabels);

	let reviewOpen = $state(false);
	let reviewTitle = $state("");
	let reviewRankLabels = $state<string[]>(engineRankLabels);
	let reviewCurrentCosts = $state<number[]>([]);
	let selectedContributionId = $state<string | null>(null);

	function openBaseFlow(row: (typeof rows)[number]) {
		if (row.baseAll.length === 0) {
			proposalMode = "engine-base";
			proposalEngineId = row.engineId;
			proposalWeaponName = row.name;
			proposalAgentId = "";
			proposalCurrentCosts = row.baseCosts;
			proposalAgentOptions = [];
			proposalRankLabels = engineBaseRankLabels;
			proposalOpen = true;
			return;
		}
		menuContext = {
			engineId: row.engineId,
			weaponName: row.name,
			currentCosts: row.baseCosts,
			rankLabels: engineBaseRankLabels,
		};
		menuTitle = `${row.name} — базовая стоимость`;
		menuItems = row.baseAll;
		menuOpen = true;
	}

	function openAgentFlow(row: (typeof rows)[number], o: (typeof row.overrideRows)[number]) {
		const displayName = agentDisplay(o.agentId).name;
		if (o.contribs.length === 0) {
			proposalMode = "engine-agent";
			proposalEngineId = row.engineId;
			proposalWeaponName = row.name;
			proposalAgentId = o.agentId;
			proposalCurrentCosts = o.costs;
			proposalAgentOptions = [];
			proposalRankLabels = engineRankLabels;
			proposalOpen = true;
			return;
		}
		menuContext = {
			engineId: row.engineId,
			weaponName: row.name,
			overrideAgentId: o.agentId,
			agentDisplayName: displayName,
			currentCosts: o.costs,
			rankLabels: engineRankLabels,
		};
		menuTitle = `${row.name} — ${displayName}`;
		menuItems = o.contribs;
		menuOpen = true;
	}

	function openAddAgentFlow(row: (typeof rows)[number]) {
		proposalMode = "engine-agent";
		proposalEngineId = row.engineId;
		proposalWeaponName = row.name;
		proposalAgentId = "";
		proposalCurrentCosts = row.baseCosts.slice(0, 5);
		proposalAgentOptions = row.availableAgentOptions;
		proposalRankLabels = engineRankLabels;
		proposalOpen = true;
	}

	function handleMenuSelect(c: ContributionListItem) {
		menuOpen = false;
		if (!menuContext) return;
		selectedContributionId = c.id;
		reviewTitle = menuContext.overrideAgentId
			? `${menuContext.weaponName} — ${menuContext.agentDisplayName}`
			: `${menuContext.weaponName} — базовая стоимость`;
		reviewRankLabels = menuContext.rankLabels;
		reviewCurrentCosts = menuContext.currentCosts;
		reviewOpen = true;
	}

	function handleMenuPropose() {
		menuOpen = false;
		if (!menuContext) return;
		proposalMode = menuContext.overrideAgentId ? "engine-agent" : "engine-base";
		proposalEngineId = menuContext.engineId;
		proposalWeaponName = menuContext.weaponName;
		proposalAgentId = menuContext.overrideAgentId ?? "";
		proposalCurrentCosts = menuContext.currentCosts;
		proposalAgentOptions = [];
		proposalRankLabels = menuContext.rankLabels;
		proposalOpen = true;
	}

	const approvedLog = $derived(
		[...$contributions]
			.filter((c) => c.engineId && c.status === "approved")
			.sort((a, b) => b.createdAt - a.createdAt),
	);

	const rejectedLog = $derived(
		[...$contributions]
			.filter((c) => c.engineId && c.status === "rejected")
			.sort((a, b) => b.createdAt - a.createdAt),
	);

	function weaponDisplay(engineId: string) {
		const w = $weaponCosts.find((w) => w.engineId === engineId);
		return { name: w?.name ?? engineId, avatarSrc: getWeaponAvatar(engineId)?.src, weapon: w };
	}

	function openLogEntry(c: ContributionListItem) {
		if (!c.engineId) return;
		const { weapon } = weaponDisplay(c.engineId);
		if (!weapon) return;
		selectedContributionId = c.id;
		if (c.overrideAgentId) {
			const override = weapon.agentOverrides.find((o) => o.agentId === c.overrideAgentId);
			reviewCurrentCosts = override?.costs ?? weapon.baseCosts.slice(0, 5);
			reviewTitle = `${weapon.name} — ${agentDisplay(c.overrideAgentId).name}`;
			reviewRankLabels = engineRankLabels;
		} else {
			reviewCurrentCosts = weapon.baseCosts;
			reviewTitle = `${weapon.name} — базовая стоимость`;
			reviewRankLabels = engineBaseRankLabels;
		}
		reviewOpen = true;
	}
</script>

<div class="card weapon-card">
	<h2>W-Engines</h2>

	<div class="specialty-tabs">
		{#each specialties as s (s.id)}
			<button
				class="specialty-tab"
				class:active={activeSpecialty === s.id}
				onclick={() => (activeSpecialty = s.id)}
			>
				{#if pendingCountBySpecialty[s.id]}
					<span class="tab-badge">{pendingCountBySpecialty[s.id]}</span>
				{/if}
				{s.label}
			</button>
		{/each}
	</div>

	<div class="specialty-heading">
		<h3>{activeInfo.label}</h3>
		{#if groupsWithOverrides.length > 0}
			<button type="button" class="toggle-all-btn" onclick={toggleAllGroups}>
				{allCollapsed ? "Развернуть всё" : "Свернуть всё"}
			</button>
		{/if}
	</div>

	{#if rows.length === 0}
		<p class="notice">Нет W-engine в этой категории.</p>
	{:else}
		<div class="weapon-scroll">
			<div class="weapon-grid">
				<div class="weapon-header-row">
					<div class="weapon-name-col"></div>
					{#each engineRankLabels as r (r)}
						<div class="weapon-col-label">{r}</div>
					{/each}
				</div>

				{#each rows as row (row.engineId)}
					{@const collapsed = collapsedGroups.has(row.engineId)}
					<div class="weapon-group">
						<div class="weapon-row">
							<div class="weapon-name-cell">
								<button type="button" class="weapon-agent" onclick={() => openBaseFlow(row)}>
									{#if row.avatar}
										<img class="weapon-avatar" src={row.avatar.src} alt="" />
									{:else}
										<div class="weapon-avatar placeholder"></div>
									{/if}
									<span class="weapon-name">{row.name}</span>
									{#if row.baseScore !== null}
										<span
											class="contrib-alert"
											style="background:{contributionColor(row.baseScore)}"
											title="Есть предложение по изменению базовой стоимости"
										>!</span>
									{/if}
								</button>
								{#if row.overrideRows.length > 0}
									<button
										type="button"
										class="group-toggle"
										onclick={() => toggleGroup(row.engineId)}
										title={collapsed ? "Показать стоимость по агентам" : "Свернуть стоимость по агентам"}
									>
										<svg class="group-toggle-caret" class:collapsed width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
										{row.overrideRows.length}
										{#if collapsed && row.overridesPendingScore !== null}
											<span
												class="contrib-alert small"
												style="background:{contributionColor(row.overridesPendingScore)}"
												title="Внутри есть предложения по изменению стоимости"
											>!</span>
										{/if}
									</button>
								{/if}
							</div>
							{#each row.baseCosts.slice(0, 5) as value, i (i)}
								<div class="weapon-cell col-{i}" class:empty={value >= 9999}>
									{value}
								</div>
							{/each}
						</div>

						{#if !collapsed}
							{#each row.overrideRows as o (o.agentId)}
								{@const info = agentDisplay(o.agentId)}
								<div class="weapon-row sub-row">
									<button type="button" class="weapon-agent sub-agent" onclick={() => openAgentFlow(row, o)}>
										{#if info.avatarSrc}
											<img class="weapon-avatar sub-avatar" src={info.avatarSrc} alt="" />
										{/if}
										<span class="weapon-name">{info.name}</span>
										{#if o.isNew}
											<span class="new-tag">новое</span>
										{/if}
										{#if o.pendingScore !== null}
											<span
												class="contrib-alert small"
												style="background:{contributionColor(o.pendingScore)}"
												title="Есть предложение по изменению стоимости"
											>!</span>
										{/if}
									</button>
									{#each o.costs as value, i (i)}
										<div class="weapon-cell sub-cell col-{i}" class:empty={value >= 9999}>
											{value}
										</div>
									{/each}
								</div>
							{/each}

							<button type="button" class="add-agent-row" onclick={() => openAddAgentFlow(row)}>
								+ Добавить агента
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="log-columns">
	<div class="card log-card">
		<h2 class="log-heading rejected">Отклонённые изменения</h2>
		{#if rejectedLog.length === 0}
			<p class="notice">Пока нет отклонённых предложений.</p>
		{:else}
			<div class="log-list">
				{#each rejectedLog as c (c.id)}
					{@const info = weaponDisplay(c.engineId!)}
					<button type="button" class="log-item" onclick={() => openLogEntry(c)}>
						{#if info.avatarSrc}<img class="log-avatar" src={info.avatarSrc} alt="" />{/if}
						<span class="log-body">
							<span class="log-title"
								>{info.name}{c.overrideAgentId ? ` — ${agentDisplay(c.overrideAgentId).name}` : ""} — {c.authorName}</span
							>
							<span class="log-msg">{c.message}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="card log-card">
		<h2 class="log-heading approved">Принятые изменения</h2>
		{#if approvedLog.length === 0}
			<p class="notice">Пока нет принятых предложений.</p>
		{:else}
			<div class="log-list">
				{#each approvedLog as c (c.id)}
					{@const info = weaponDisplay(c.engineId!)}
					<button type="button" class="log-item" onclick={() => openLogEntry(c)}>
						{#if info.avatarSrc}<img class="log-avatar" src={info.avatarSrc} alt="" />{/if}
						<span class="log-body">
							<span class="log-title"
								>{info.name}{c.overrideAgentId ? ` — ${agentDisplay(c.overrideAgentId).name}` : ""} — {c.authorName}</span
							>
							<span class="log-msg">{c.message}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<ContributionMenu
	bind:open={menuOpen}
	agentName={menuTitle}
	items={menuItems}
	onSelect={handleMenuSelect}
	onPropose={handleMenuPropose}
/>

<ContributionProposalPopup
	bind:open={proposalOpen}
	mode={proposalMode}
	engineId={proposalEngineId}
	weaponName={proposalWeaponName}
	agentId={proposalAgentId}
	currentCosts={proposalCurrentCosts}
	agentOptions={proposalAgentOptions}
	rankLabels={proposalRankLabels}
/>

<ContributionReviewPopup
	bind:open={reviewOpen}
	contributionId={selectedContributionId}
	agentName={reviewTitle}
	currentCosts={reviewCurrentCosts}
	rankLabels={reviewRankLabels}
/>

<style>
	.weapon-card {
		padding: 24px 28px;
		gap: 16px;
	}

	.specialty-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.specialty-tab {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		color: var(--text-muted);
		padding: 6px 13px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: 0.15s;
	}

	.tab-badge {
		position: absolute;
		top: -7px;
		left: -7px;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 9px;
		background: var(--danger);
		color: #fff;
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 2px var(--surface);
	}

	.specialty-tab:hover {
		border-color: var(--border-soft);
		color: var(--text);
	}

	.specialty-tab.active {
		border-color: var(--gold-border);
		color: var(--gold);
		background: var(--gold-dim);
		font-weight: 700;
	}

	.specialty-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.specialty-heading h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--gold);
	}

	.toggle-all-btn {
		all: unset;
		box-sizing: border-box;
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		background: var(--surface-2);
		border: 1px solid var(--border);
		padding: 6px 12px;
		border-radius: var(--r-sm);
	}

	.toggle-all-btn:hover {
		color: var(--text);
		border-color: var(--border-soft);
	}

	.weapon-scroll {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.weapon-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 620px;
	}

	.weapon-header-row,
	.weapon-row {
		display: grid;
		grid-template-columns: minmax(180px, 260px) repeat(5, minmax(56px, 1fr));
		gap: 8px;
		align-items: center;
	}

	.weapon-header-row {
		padding: 0 2px 4px;
	}

	.weapon-col-label {
		text-align: center;
		font-size: 11px;
		font-weight: 700;
		color: var(--text-dim);
	}

	.weapon-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.weapon-name-cell {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.weapon-name-cell .weapon-agent {
		min-width: 0;
		flex: 1 1 auto;
	}

	.group-toggle {
		all: unset;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
		cursor: pointer;
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		padding: 4px 9px 4px 8px;
		border-radius: 999px;
	}

	.group-toggle:hover {
		color: var(--text);
		border-color: var(--border);
		background: var(--surface-hover);
	}

	.group-toggle-caret {
		flex-shrink: 0;
		transition: transform 0.15s ease;
	}

	.group-toggle-caret.collapsed {
		transform: rotate(-90deg);
	}

	.weapon-agent {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		cursor: pointer;
		border-radius: var(--r-sm);
		padding: 4px;
		margin: -4px;
	}

	.weapon-agent:hover {
		background: var(--surface-hover);
	}

	.sub-agent {
		padding-left: 24px;
		margin-left: -24px;
	}

	.weapon-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--r-sm);
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.weapon-avatar.sub-avatar {
		width: 26px;
		height: 26px;
	}

	.weapon-avatar.placeholder {
		background: var(--surface-2);
	}

	.weapon-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		font-size: 14px;
	}

	.sub-row .weapon-name {
		font-weight: 500;
		font-size: 12px;
		color: var(--text-muted);
	}

	.new-tag {
		flex-shrink: 0;
		font-size: 9px;
		font-weight: 700;
		color: var(--gold);
		background: var(--gold-dim);
		padding: 1px 5px;
		border-radius: 4px;
	}

	.contrib-alert {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 14px;
		line-height: 1;
		color: #fff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
	}

	.contrib-alert.small {
		width: 16px;
		height: 16px;
		font-size: 11px;
	}

	.add-agent-row {
		all: unset;
		box-sizing: border-box;
		cursor: pointer;
		align-self: flex-start;
		padding: 2px 0 0 41px;
		font-size: 11px;
		color: var(--text-dim);
	}

	.add-agent-row:hover {
		color: var(--text-muted);
	}

	.weapon-cell {
		text-align: center;
		padding: 9px 4px;
		border-radius: var(--r-sm);
		font-weight: 700;
		font-size: 14px;
	}

	.weapon-cell.sub-cell {
		padding: 6px 4px;
		font-size: 12px;
	}

	.weapon-cell.col-0 {
		background: #163a3d;
		color: #7fd8cf;
	}

	.weapon-cell.col-1 {
		background: #163a52;
		color: #74c0e8;
	}

	.weapon-cell.col-2 {
		background: #24325c;
		color: #93a6f2;
	}

	.weapon-cell.col-3 {
		background: #3a2c63;
		color: #c2a4f5;
	}

	.weapon-cell.col-4 {
		background: #55295c;
		color: #e2a0e0;
	}

	.weapon-cell.empty {
		background: var(--surface-hover);
		color: var(--text-dim);
	}

	.log-heading {
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
		font-size: 14px;
	}

	.log-heading.rejected {
		color: var(--danger);
	}

	.log-heading.approved {
		color: var(--success);
	}

	.log-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}

	.log-columns .log-card {
		min-width: 0;
		padding: 20px;
		gap: 10px;
	}

	@media (max-width: 700px) {
		.log-columns {
			grid-template-columns: 1fr;
		}
	}

	.log-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.log-item {
		all: unset;
		box-sizing: border-box;
		display: flex;
		gap: 10px;
		align-items: center;
		width: 100%;
		min-width: 0;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		padding: 9px 11px;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.log-item:hover {
		border-color: var(--gold-border);
	}

	.log-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--r-sm);
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}

	.log-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.log-title {
		font-weight: 600;
		font-size: 12px;
	}

	.log-msg {
		font-size: 12px;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
