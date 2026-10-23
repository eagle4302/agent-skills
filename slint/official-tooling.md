# Official Slint Tooling Check

This skill was installed on its own, without the Slint plugin that normally
ships next to it. Several steps in [SKILL.md](SKILL.md) need official Slint
tools that this install does not provide. Check for them once per session,
the first time you work on a Slint project, and tell the user what is missing.

## Rules

- **Check, then offer. Never install without a yes.** Name each missing
  component, say what it unlocks, and give the exact command for the user's
  OS. Install only after the user agrees.
- **One message, once per session.** Group everything that is missing into a
  single list. If the user declines, don't raise it again this session.
- **Carry on either way.** A missing tool changes how you verify the work. It
  never blocks the edit.
- **Official sources only.** Recommend Slint's own releases, registries, and
  repos (`slint-ui/*`, `slint.dev`). Never suggest third-party builds or mirrors.

## What to Check

| Component | How to detect it | What it unlocks | Install |
|---|---|---|---|
| `slint-viewer` | on `PATH` (`which slint-viewer`; Windows: `where.exe slint-viewer`) | Workflow steps 2–3: `--check`, `--screenshot`, `--auto-reload`, MCP access to a `.slint` file `(1.18+)` | [tools-install.md](tools-install.md) |
| `slint-lsp` | on `PATH` (`which slint-lsp`; Windows: `where.exe slint-lsp`) | Diagnostics, hover, go-to-definition, and formatting in editors and agents that speak LSP | [tools-install.md](tools-install.md) |
| `slint-docs` MCP server | the `search` and `fetch` tools from `slint-docs` are connected | Doc lookups that cost fewer tokens than fetching pages over HTTP | add the remote HTTP server `https://docs.slint.dev/mcp`; Claude Code: `claude mcp add --transport http slint-docs https://docs.slint.dev/mcp` |
| Editor extension | the user edits `.slint` files in an IDE | Live preview and diagnostics in the editor | VS Code: [Slint extension](https://marketplace.visualstudio.com/items?itemName=Slint.slint); other editors: the Slint docs' tooling guides |

Check the next two only when the task needs them:

- **Runtime MCP in the user's app**, for driving a running app (clicks, typing,
  screenshots with real data). It needs a per-language dev package. Rust uses
  `--features slint/mcp`, Node.js uses `slint-ui-dev`, and Python uses
  `slint[dev]`. C++ needs Slint built from source with `-DSLINT_FEATURE_MCP=ON`.
  Details are in [debugging-and-mcp.md](reference/debugging-and-mcp.md).
- **Linux runtime libraries** for `slint-viewer` on Debian/Ubuntu. See
  [tools-install.md](tools-install.md).

## The Full Official Plugin

If the user wants the whole official package in Claude Code, Codex, Cursor, or
Antigravity, point them to Slint's plugin. In Claude Code:

```sh
/plugin marketplace add slint-ui/ai-plugins
/plugin install slint@slint
```

The plugin bundles this skill with the `slint-lsp` wiring, the `slint-docs` and
`slint-preview` MCP servers, and a startup check for `slint-lsp`. Installing
it gives the user a second copy of this skill, so tell them to pick one: keep
the plugin and remove this copy, or keep this copy and add only the
components from the table above.
