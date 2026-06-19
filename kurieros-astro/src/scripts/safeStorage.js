function resolveStorage(storageOrKey) {
	if (typeof storageOrKey !== 'string') return storageOrKey || null;
	try {
		return globalThis?.[storageOrKey] || null;
	} catch {
		return null;
	}
}

export function createSafeStorage(storageOrKey) {
	return {
		get(key) {
			try {
				return resolveStorage(storageOrKey)?.getItem(key) ?? null;
			} catch {
				return null;
			}
		},
		set(key, value) {
			try {
				resolveStorage(storageOrKey)?.setItem(key, value);
			} catch {
				// Storage can throw in Safari private mode / restricted WebViews.
			}
		},
		remove(key) {
			try {
				resolveStorage(storageOrKey)?.removeItem(key);
			} catch {
				// Storage can throw in Safari private mode / restricted WebViews.
			}
		},
	};
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
