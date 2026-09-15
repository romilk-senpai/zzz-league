<script lang="ts">
	import { contributionColor, type ContributionListItem } from "$lib/contributions";

	let {
		open = $bindable(false),
		agentName = "",
		items = [] as ContributionListItem[],
		onSelect,
		onPropose,
	}: {
		open?: boolean;
		agentName?: string;
		items?: ContributionListItem[];
		onSelect: (contribution: ContributionListItem) => void;
		onPropose: () => void;
	} = $props();

	function statusLabel(c: ContributionListItem): string {
		if (c.status === "approved") return "Принято";
		if (c.status === "rejected") return "Отклонено";
		return "На рассмотрении";
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card menu-card" onclick={(e) => e.stopPropagation()}>
			<div class="close-row">
				<button class="icon-btn" onclick={() => (open = false)} aria-label="Закрыть">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<h2 class="popup-title">{agentName}</h2>
			{#if items.length === 0}
				<p class="notice">Пока нет предложений по изменению стоимости.</p>
			{:else}
				<div class="menu-list">
					{#each items as c (c.id)}
						<button type="button" class="menu-item" onclick={() => onSelect(c)}>
							<span
								class="menu-dot"
								class:approved={c.status === "approved"}
								class:rejected={c.status === "rejected"}
								style={c.status === "pending" ? `background:${contributionColor(c.score)}` : ""}
							></span>
							<span class="menu-item-body">
								<span class="menu-item-title">{c.authorName} — {statusLabel(c)}</span>
								<span class="menu-item-msg">{c.message}</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
			<button class="btn-common btn-play btn-block" onclick={onPropose}>+ Предложить изменение</button>
		</div>
	</div>
{/if}

<style>
	.menu-card {
		width: 460px;
		max-width: 90vw;
		padding: 20px 26px 26px;
		gap: 14px;
	}

	.close-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: -8px;
	}

	.popup-title {
		font-size: 16px;
		font-weight: 800;
		border: none;
		padding-bottom: 0;
		margin-bottom: 0;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 320px;
		overflow-y: auto;
	}

	.menu-item {
		all: unset;
		box-sizing: border-box;
		cursor: pointer;
		display: flex;
		gap: 10px;
		padding: 10px 12px;
		width: 100%;
		background: var(--surface-2);
		border: 1px solid var(--border-soft);
		border-radius: var(--r-md);
		align-items: flex-start;
		transition: border-color 0.15s;
	}

	.menu-item:hover {
		border-color: var(--gold-border);
	}

	.menu-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		margin-top: 4px;
		flex-shrink: 0;
		background: var(--text-dim);
	}

	.menu-dot.approved {
		background: var(--success);
	}

	.menu-dot.rejected {
		background: var(--text-dim);
	}

	.menu-item-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.menu-item-title {
		font-weight: 600;
		font-size: 12px;
	}

	.menu-item-msg {
		font-size: 12px;
		color: var(--text-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-block {
		width: 100%;
		margin-top: 4px;
	}
</style>
