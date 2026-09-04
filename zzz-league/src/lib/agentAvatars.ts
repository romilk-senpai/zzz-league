const modules = import.meta.glob<{ default: string }>(
	'./assets/agents/*.webp',
	{ eager: true },
);

export interface AgentAvatar {
	id: string;
	name: string;
	src: string;
}

const nameOverrides: Record<string, string> = {
	'orphie-magnusson-magus': 'Orphie & Magus',
};

function toDisplayName(id: string): string {
	if (nameOverrides[id]) return nameOverrides[id];
	return id
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export const agentAvatars: AgentAvatar[] = Object.entries(modules)
	.map(([path, mod]) => {
		const id = path.split('/').pop()!.replace('.webp', '');
		return { id, name: toDisplayName(id), src: mod.default };
	})
	.sort((a, b) => a.name.localeCompare(b.name));

const avatarsById = new Map(agentAvatars.map((a) => [a.id, a]));

export function getAgentAvatar(id?: string | null): AgentAvatar | undefined {
	return id ? avatarsById.get(id) : undefined;
}
