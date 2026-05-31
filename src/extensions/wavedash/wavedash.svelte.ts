import type { WavedashSDK } from '@wvdsh/sdk-js';

// IMPORTANT: the host installs `window.Wavedash` as a *Promise* that resolves to
// the SDK singleton (see the official example: `const Wavedash = await window.Wavedash`).
// Calling methods on the unresolved promise silently does nothing — which is why
// the host's setup warning never cleared. We must await it first.
// Type-only import keeps us type-safe without pulling in the runtime.

let sdk: WavedashSDK | null = null;
let initialized = false;
let scoreboardId: string | null = null;
let speedrunId: string | null = null;

export type LeaderboardEntry = {
	globalRank: number;
	username: string;
	score: number;
};

export type AchievementNotif = {
	id: string;
	title: string;
	icon: string;
};

const ACHIEVEMENT_META: Record<string, { title: string; icon: string }> = {
	fork:      { title: 'Fork Collector',  icon: '🍴' },
	matchstick:{ title: 'Fire Starter',    icon: '🔥' },
	lighter:   { title: 'Light It Up',     icon: '🔥' },
	phone:     { title: 'Pocket Sized',    icon: '📱' },
	thimble:   { title: 'Thimble Finder',  icon: '🧵' },
	winner:    { title: 'Home Sweet Home', icon: '🏆' }
};

export const leaderboardState = $state({
	topItems: [] as LeaderboardEntry[],
	myEntry: null as LeaderboardEntry | null,
	speedrunTop: [] as LeaderboardEntry[],
	speedrunMyEntry: null as LeaderboardEntry | null,
	loading: false,
	ready: false
});

export const achievementNotifState = $state({
	current: null as AchievementNotif | null
});

const notifQueue: AchievementNotif[] = [];
let notifTimer: ReturnType<typeof setTimeout> | null = null;

function queueNotif(notif: AchievementNotif) {
	notifQueue.push(notif);
	if (!notifTimer) showNextNotif();
}

function showNextNotif() {
	if (notifQueue.length === 0) { notifTimer = null; return; }
	achievementNotifState.current = notifQueue.shift()!;
	notifTimer = setTimeout(() => {
		achievementNotifState.current = null;
		notifTimer = null;
		showNextNotif();
	}, 3500);
}

const resolveSDK = async (): Promise<WavedashSDK | null> => {
	if (sdk) return sdk;
	if (typeof window === 'undefined') return null;
	// The host may install window.Wavedash slightly after our bundle starts;
	// poll briefly until it appears.
	let tries = 0;
	let handle = (window as Window & { Wavedash?: unknown }).Wavedash;
	while (!handle && tries++ < 100) {
		await new Promise((r) => setTimeout(r, 100));
		handle = (window as Window & { Wavedash?: unknown }).Wavedash;
	}
	if (!handle) return null;
	// Awaiting works whether the host gives a Promise<SDK> or the SDK directly.
	sdk = (await handle) as WavedashSDK;
	return sdk;
};

async function initLeaderboards(s: WavedashSDK): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const a = s as any;
	const [lb, sr] = await Promise.all([
		a.getOrCreateLeaderboard('scoreboard', a.LeaderboardSortOrder.DESC, a.LeaderboardDisplayType.NUMERIC),
		a.getOrCreateLeaderboard('speedrun', a.LeaderboardSortOrder.ASC, a.LeaderboardDisplayType.TIME_MILLISECONDS)
	]);
	scoreboardId = lb?.success ? lb.data.id : null;
	speedrunId = sr?.success ? sr.data.id : null;
	leaderboardState.ready = !!scoreboardId;
}

export const wavedashActions = {
	async updateProgress(zeroToOne: number) {
		const s = await resolveSDK();
		if (!s) return;
		s.updateLoadProgressZeroToOne(Math.max(0, Math.min(1, zeroToOne)));
	},

	async init() {
		if (initialized) return;
		const s = await resolveSDK();
		if (!s) return;
		initialized = true;
		s.init({ debug: import.meta.env.DEV });
	},

	async refreshScores() {
		const s = await resolveSDK();
		if (!s || !scoreboardId) return;
		leaderboardState.loading = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const a = s as any;
			const promises = [
				a.listLeaderboardEntries(scoreboardId, 0, 10, false),
				a.getMyLeaderboardEntries(scoreboardId),
				speedrunId ? a.listLeaderboardEntries(speedrunId, 0, 5, false) : Promise.resolve(null),
				speedrunId ? a.getMyLeaderboardEntries(speedrunId) : Promise.resolve(null)
			];
			const [top, mine, speedTop, speedMine] = await Promise.all(promises);
			leaderboardState.topItems = (top?.data ?? []) as LeaderboardEntry[];
			const myRaw = mine?.data;
			leaderboardState.myEntry = (
				Array.isArray(myRaw) ? (myRaw[0] ?? null) : (myRaw ?? null)
			) as LeaderboardEntry | null;
			leaderboardState.speedrunTop = ((speedTop as any)?.data ?? []) as LeaderboardEntry[];
			const speedMyRaw = (speedMine as any)?.data;
			leaderboardState.speedrunMyEntry = (
				Array.isArray(speedMyRaw) ? (speedMyRaw[0] ?? null) : (speedMyRaw ?? null)
			) as LeaderboardEntry | null;
		} finally {
			leaderboardState.loading = false;
		}
	},

	onDecorationDelivered(index: number) {
		const ACHIEVEMENT_IDS = ['fork', 'matchstick', 'lighter', 'phone', 'thimble'];
		const id = ACHIEVEMENT_IDS[index];
		if (!id) return;
		const meta = ACHIEVEMENT_META[id];
		queueNotif({ id, ...meta });
		resolveSDK().then((s) => {
			if (!s) return;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(s as any).setAchievement(id, true);
		});
	},

	onGameWin() {
		const meta = ACHIEVEMENT_META['winner'];
		queueNotif({ id: 'winner', ...meta });
		resolveSDK().then((s) => {
			if (!s) return;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(s as any).setAchievement('winner', true);
		});
	},

	// avgTimeMs only passed on a full win — speedrun board only tracks complete runs
	async submitRunScore(itemsCollected: number, avgTimeMs?: number) {
		const s = await resolveSDK();
		if (!s) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const a = s as any;
		const uploads: Promise<unknown>[] = [];
		if (scoreboardId) uploads.push(a.uploadLeaderboardScore(scoreboardId, itemsCollected, true));
		if (speedrunId && avgTimeMs != null) uploads.push(a.uploadLeaderboardScore(speedrunId, avgTimeMs, true));
		await Promise.all(uploads);
		await wavedashActions.refreshScores();
	}
};

// Call once at app startup. Awaits the host SDK then inits immediately, so the
// host's setup warning clears and the game is revealed without depending on the
// asset loader. Safe no-op outside the Wavedash host (e.g. plain `vite dev`).
export async function startWavedash(): Promise<void> {
	const s = await resolveSDK();
	if (!s || initialized) return;
	initialized = true;
	s.updateLoadProgressZeroToOne(1);
	s.init({ debug: import.meta.env.DEV });
	await initLeaderboards(s);
}
