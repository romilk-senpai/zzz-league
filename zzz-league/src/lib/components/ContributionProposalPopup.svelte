<script lang="ts">
	import { mindscapeLabels } from "$lib/costData";
	import { createContribution } from "$lib/mockContributions";
	import { currentUser } from "$lib/store";

	let {
		open = $bindable(false),
		agentId = "",
		agentName = "",
		currentCosts = [] as number[],
	}: {
		open?: boolean;
		agentId?: string;
		agentName?: string;
		currentCosts?: number[];
	} = $props();

	let costs = $state<number[]>([]);
	let message = $state("");

	$effect(() => {
		if (open) {
			costs = [...currentCosts];
			message = "";
		}
	});

	function submit() {
		const authorName = $currentUser?.name ?? "Вы";
		createContribution(agentId, authorName, message.trim() || "Без комментария", costs);
		open = false;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popup" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="card proposal-card" onclick={(e) => e.stopPropagation()}>
			<h2>Предложить изменение — {agentName}</h2>
			<div class="cost-inputs">
				{#each mindscapeLabels as label, i (label)}
					<div class="cost-input-row">
						<label for="cost-input-{i}">{label}</label>
						<input id="cost-input-{i}" type="number" bind:value={costs[i]} />
					</div>
				{/each}
			</div>
			<textarea rows="3" placeholder="Почему стоит изменить стоимость?" bind:value={message}></textarea>
			<div class="btn-row">
				<button class="btn-common btn-play" onclick={submit}>Отправить предложение</button>
				<button class="btn-common" onclick={() => (open = false)}>Отмена</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.proposal-card {
		width: 480px;
		max-width: 90vw;
	}

	.cost-inputs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.cost-input-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cost-input-row label {
		font-size: 11px;
		color: #888;
	}

	.cost-input-row input {
		padding: 6px;
	}
</style>
