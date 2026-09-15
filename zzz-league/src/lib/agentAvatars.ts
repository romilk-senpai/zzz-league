// Two pre-resized tiers (see scripts/resize-avatars.mjs) instead of the ~283x307 masters —
// `src` (96px) covers every small icon-ish usage, `srcLarge` (192px) the couple of full-size
// avatar displays (profile popup, settings). Never import the masters directly into a component.
const smallModules = import.meta.glob<{ default: string }>(
	'./assets/agents/sm/*.webp',
	{ eager: true },
);
const largeModules = import.meta.glob<{ default: string }>(
	'./assets/agents/lg/*.webp',
	{ eager: true },
);

export interface AgentAvatar {
	id: string;
	name: string;
	src: string;
	srcLarge: string;
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

export const agentAvatars: AgentAvatar[] = Object.entries(smallModules)
	.map(([path, mod]) => {
		const id = path.split('/').pop()!.replace('.webp', '');
		const large = largeModules[`./assets/agents/lg/${id}.webp`];
		return { id, name: toDisplayName(id), src: mod.default, srcLarge: large?.default ?? mod.default };
	})
	.sort((a, b) => a.name.localeCompare(b.name));

const avatarsById = new Map(agentAvatars.map((a) => [a.id, a]));

export function getAgentAvatar(id?: string | null): AgentAvatar | undefined {
	return id ? avatarsById.get(id) : undefined;
}
