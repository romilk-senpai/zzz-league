<script lang="ts">
	import { contributionColor, contributionScore, type Contribution } from "$lib/mockContributions";

	let {
		open = $bindable(false),
		agentName = "",
		items = [] as Contribution[],
		onSelect,
		onPropose,
	}: {
		open?: boolean;
		agentName?: string;
		items?: Contribution[];
		onSelect: (contribution: Contribution) => void;
		onPropose: () => void;
	} = $props();

	function statusLabel(c: Contribution): string {
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
			<h2>{agentName}</h2>
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
								style={c.status === "pending"
									? `background:${contributionColor(contributionScore(c.reviews))}`
									: ""}
							></span>
							<span class="menu-item-body">
								<span class="menu-item-title">{c.authorName} — {statusLabel(c)}</span>
								<span class="menu-item-msg">{c.message}</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={onPropose}>+ Предложить изменение</button>
				<button class="btn-common" onclick={() => (open = false)}>Закрыть</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.menu-card {
		width: 480px;
		max-width: 90vw;
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
		padding: 10px;
		width: 100%;
		background: #222;
		border: 1px solid #333;
		border-radius: 8px;
		align-items: flex-start;
	}

	.menu-item:hover {
		border-color: #555;
	}

	.menu-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-top: 4px;
		flex-shrink: 0;
		background: #666;
	}

	.menu-dot.approved {
		background: var(--gold);
	}

	.menu-dot.rejected {
		background: #666;
	}

	.menu-item-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.menu-item-title {
		font-weight: 600;
		font-size: 13px;
	}

	.menu-item-msg {
		font-size: 12px;
		color: #aaa;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
