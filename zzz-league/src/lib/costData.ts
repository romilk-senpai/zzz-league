import { writable } from "svelte/store";
import { listAgentCosts } from "./api/communityCosts";

export type Specialty =
	| "attack"
	| "stun"
	| "anomaly"
	| "support"
	| "defense"
	| "rupture"
	| "armorer";

export interface SpecialtyInfo {
	id: Specialty;
	label: string;
}

export const specialties: SpecialtyInfo[] = [
	{ id: "attack", label: "Attack" },
	{ id: "stun", label: "Stun" },
	{ id: "anomaly", label: "Anomaly" },
	{ id: "support", label: "Support" },
	{ id: "defense", label: "Defense" },
	{ id: "rupture", label: "Rupture" },
	{ id: "armorer", label: "Armorer" },
];

export const specialtyById = new Map(specialties.map((s) => [s.id, s]));

export interface AgentCost {
	agentId: string;
	name: string;
	specialty: Specialty;
	/** Darte's raw rarity value (3/4/5, higher = rarer/stronger tier). */
	rarity: number;
	/** Point cost at Mindscape 0 through 6. 9999 marks levels the community hasn't costed (effectively banned). */
	costs: number[];
}

export const mindscapeLabels = ["M0", "M1", "M2", "M3", "M4", "M5", "M6"];

// Backed by ZenlessLeague.Api's /api/community-costs/agents — refreshAgentCosts() is called once
// from the /costs route on mount.
export const agentCosts = writable<AgentCost[]>([]);

export async function refreshAgentCosts(): Promise<void> {
	agentCosts.set(await listAgentCosts());
}
