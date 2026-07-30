/**
 * Model Profiles Extension
 *
 * Named profiles of model + thinking effort, with favorites you can cycle.
 *
 * Config files (merged, project wins on name conflicts):
 * - ~/.pi/agent/model-profiles.json (global)
 * - <cwd>/.pi/model-profiles.json (project-local)
 *
 * Example model-profiles.json:
 * ```json
 * {
 *   "deep": {
 *     "provider": "anthropic",
 *     "model": "claude-opus-4-1",
 *     "thinkingLevel": "high",
 *     "favorite": true
 *   },
 *   "fast": {
 *     "provider": "openai",
 *     "model": "gpt-5-mini",
 *     "thinkingLevel": "low",
 *     "favorite": true
 *   }
 * }
 * ```
 *
 * Usage:
 * - `/profile` - pick a profile from a list (favorites marked with ★)
 * - `/profile deep` - apply a profile by name
 * - `alt+p` - cycle through favorite profiles
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

interface Profile {
	/** Provider name (e.g., "anthropic", "openai") */
	provider: string;
	/** Model ID (e.g., "claude-sonnet-4-5") */
	model: string;
	/** Thinking level (default: leave unchanged) */
	thinkingLevel?: ThinkingLevel;
	/** Include in alt+p cycling */
	favorite?: boolean;
}

type ProfilesConfig = Record<string, Profile>;

function loadProfiles(cwd: string): ProfilesConfig {
	const paths = [join(getAgentDir(), "model-profiles.json"), join(cwd, CONFIG_DIR_NAME, "model-profiles.json")];

	let merged: ProfilesConfig = {};
	for (const path of paths) {
		if (!existsSync(path)) continue;
		try {
			merged = { ...merged, ...JSON.parse(readFileSync(path, "utf-8")) };
		} catch (err) {
			console.error(`Failed to load profiles from ${path}: ${err}`);
		}
	}
	return merged;
}

function describe(name: string, p: Profile): string {
	const fav = p.favorite ? "★ " : "";
	return `${fav}${name} — ${p.provider}/${p.model}${p.thinkingLevel ? ` (${p.thinkingLevel})` : ""}`;
}

export default function modelProfiles(pi: ExtensionAPI) {
	let profiles: ProfilesConfig = {};
	let activeName: string | undefined;

	async function applyProfile(name: string, ctx: ExtensionContext): Promise<void> {
		const profile = profiles[name];
		if (!profile) {
			ctx.ui.notify(`Unknown profile "${name}". Defined: ${Object.keys(profiles).join(", ") || "(none)"}`, "warning");
			return;
		}

		const model = ctx.modelRegistry.find(profile.provider, profile.model);
		if (!model) {
			ctx.ui.notify(`Profile "${name}": model ${profile.provider}/${profile.model} not found`, "warning");
			return;
		}

		if (!(await pi.setModel(model))) {
			ctx.ui.notify(`Profile "${name}": no API key for ${profile.provider}/${profile.model}`, "warning");
			return;
		}

		if (profile.thinkingLevel) {
			pi.setThinkingLevel(profile.thinkingLevel);
		}

		activeName = name;
		ctx.ui.notify(`Profile: ${describe(name, profile)}`, "info");
	}

	async function selectProfile(ctx: ExtensionContext): Promise<void> {
		const names = Object.keys(profiles);
		if (names.length === 0) {
			ctx.ui.notify(
				`No profiles defined. Add them to ${join(getAgentDir(), "model-profiles.json")} or ${join(ctx.cwd, CONFIG_DIR_NAME, "model-profiles.json")}`,
				"warning",
			);
			return;
		}

		// ponytail: label-based select; name is recovered by index, labels are display-only
		const choice = await ctx.ui.select("Select profile:", names.map((n) => describe(n, profiles[n])));
		if (choice === undefined) return;

		const index = names.map((n) => describe(n, profiles[n])).indexOf(choice);
		await applyProfile(names[index], ctx);
	}

	function cycleFavorite(ctx: ExtensionContext): void {
		const favorites = Object.keys(profiles).filter((n) => profiles[n].favorite);
		if (favorites.length === 0) {
			ctx.ui.notify("No favorite profiles. Mark profiles with \"favorite\": true", "warning");
			return;
		}
		const next = favorites[(favorites.indexOf(activeName ?? "") + 1) % favorites.length];
		void applyProfile(next, ctx);
	}

	pi.on("session_start", async (_event, ctx) => {
		profiles = loadProfiles(ctx.cwd);
	});

	pi.registerCommand("profile", {
		description: "Apply a model profile (/profile [name])",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (name) await applyProfile(name, ctx);
			else await selectProfile(ctx);
		},
	});

	pi.registerShortcut("alt+p", {
		description: "Cycle favorite model profiles",
		handler: async (ctx) => cycleFavorite(ctx),
	});
}
