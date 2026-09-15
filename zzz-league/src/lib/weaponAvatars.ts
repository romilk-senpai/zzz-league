// Pre-resized to 80px (see scripts/resize-avatars.mjs) — weapon icons are never shown larger
// than 36px anywhere, so unlike agents there's no second "large" tier.
const modules = import.meta.glob<{ default: string }>(
	'./assets/weapons/sm/*.webp',
	{ eager: true },
);

export interface WeaponAvatar {
	id: string;
	src: string;
}

export const weaponAvatars: WeaponAvatar[] = Object.entries(modules).map(([path, mod]) => {
	const id = path.split('/').pop()!.replace('.webp', '');
	return { id, src: mod.default };
});

const avatarsById = new Map(weaponAvatars.map((a) => [a.id, a]));

export function getWeaponAvatar(id?: string | null): WeaponAvatar | undefined {
	return id ? avatarsById.get(id) : undefined;
}
