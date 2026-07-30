# pi-model-profiles

Named model + thinking-effort profiles for [pi](https://github.com/earendil-works/pi-coding-agent), with favorites you can cycle.

## Features

1. **Profiles**: named combinations of provider, model, and thinking level, any of which can be marked as favorites.
2. **`/profile`**: pick a profile from a list (favorites marked with ★) or apply one directly with `/profile <name>` — the session switches model and effort instantly.
3. **Favorites cycling**: a shortcut (`alt+p` by default) cycles through profiles marked as favorites.

## Install

```
pi install git:github.com/<owner>/pi-model-profiles
```

Or point at a local checkout in `~/.pi/agent/settings.json`:

```json
{
	"extensions": ["/path/to/pi-model-profiles/extensions/model-profiles.ts"]
}
```

## Configure

Copy `model-profiles.example.json` to `~/.pi/agent/model-profiles.json` (global) or `<project>/.pi/model-profiles.json` (project-local) and edit. Project profiles override global ones with the same name. Changes apply on session start or `/reload`.

```json
{
	"deep": {
		"provider": "anthropic",
		"model": "claude-opus-4-1",
		"thinkingLevel": "high",
		"favorite": true
	},
	"fast": {
		"provider": "openai",
		"model": "gpt-5-mini",
		"thinkingLevel": "low"
	}
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `provider` | yes | e.g. `anthropic`, `openai` |
| `model` | yes | Model ID, e.g. `claude-sonnet-4-5` |
| `thinkingLevel` | no | `off`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`; omitted = leave unchanged |
| `favorite` | no | `true` includes it in shortcut cycling |

### Shortcut

The cycle shortcut defaults to `alt+p`. Change it with a reserved `$settings` key in the same file (key format: `modifier+key`, e.g. `ctrl+shift+u`), then run `/reload`:

```json
{
	"$settings": { "cycleShortcut": "ctrl+shift+u" },
	"deep": { ... }
}
```

Thinking level is clamped to what the model supports (non-reasoning models use `off`).
