# Agent 環境設定（跨專案）

2026-10-31 建。這台機器上 Claude Code／DSH／OpenCode 共用同一套查詢工具與 skills；
這份只記「誰讀什麼、東西放哪、哪裡會踩坑」，避免每次重新摸索。

## 三個工具讀哪些指示

| 工具 | 全域 | 專案 |
| --- | --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` | repo 的 `CLAUDE.md`（再由它指向 `AGENTS.md`） |
| DSH | `~/.dsh/AGENTS.md` | repo 的 `AGENTS.md` |
| OpenCode | `~/.config/opencode/AGENTS.md` | repo 的 `AGENTS.md` |

- 三個工具**都不會自動知道**其他工具寫過的東西：沒被它讀到的指示，等於不存在。
- 跨專案要生效的規則寫全域；只適用某個 repo 的寫那份 repo 的 `AGENTS.md`／`CLAUDE.md`。

## Skills：實體只有一份

- 實體檔案在 `~/.agents/skills/<name>/SKILL.md`（這是 git repo，remote `eagle4302/agent-skills`）。
- `~/.claude/skills` 是 junction → `~/.agents/skills`。
- `~/.config/opencode/skills` 是 junction → `~/.agents/skills`。
- **實測坑（2026-10-31，opencode v2.0.21）**：opencode 不掃 `~/.agents/skills`／`~/.claude/skills`
  （官方文件說會），只吃 `~/.config/opencode/skills`；沒有那條 junction 時它回報「沒有任何 skill」。
- 新增 skill 只放 `~/.agents/skills/<name>/SKILL.md`，不要複製三份。frontmatter 的 `name` 要等於資料夾名。

## 查詢工具與順序

順序寫在 `context-first` skill（`~/.agents/skills/context-first/SKILL.md`）：

1. **CodeGraph** — 程式碼導覽（MCP `codegraph_explore`；repo 有 `.codegraph/` 才用）。
2. **Jev** — 窄判斷（固定選項／是非／評分）。
3. **Obsidian vault** — 既有決策與紀錄。
4. **graphify** — 跨來源（手冊／票／ADR ↔ 程式碼）與架構盤點；CLI only、repo 有 `graphify-out/` 才用。
5. 才規劃與改碼。

- 衝突裁決：程式碼以 CodeGraph 為準，文件與手冊以原文為準。
- graphify 沒有 MCP：`graphify query`／`path`／`explain`，或讀 `graphify-out/GRAPH_REPORT.md`。

## OpenCode 的坑

- 預設模型 `iceman-contributor-free` 會用請求資料訓練，被工作區隱私設定拒絕。
  跑 `opencode run` 時帶 `--model deepseek/deepseek-flash`。
- 非互動用法：`opencode run --standalone --model <provider/model> "<訊息>"`。
- 驗 skill 有沒有被載到：問它「列出可用 skill 名稱」。

## 要改東西時改哪裡

| 要改什麼 | 改哪裡 |
| --- | --- |
| 查詢順序 | `~/.agents/skills/context-first/SKILL.md`（只有一份） |
| 跨專案工具規則 | 三份全域指示檔各一段（DSH／OpenCode 有 graphify 專節，Claude 有 `/graphify` 觸發器） |
| 只適用某 repo 的規則 | 該 repo 的 `AGENTS.md`（＋ `CLAUDE.md` 指標） |
| skills 本體 | `~/.agents/skills/`；改完記得 commit 到 `agent-skills` repo |

## 一次性的安裝狀態（2026-10-31）

- `context-first` 已含 graphify 那一步。
- `~/.dsh/AGENTS.md`、`~/.config/opencode/AGENTS.md` 都已寫入 graphify 的用法與界線。
- 兩條 junction（`~/.claude/skills`、`~/.config/opencode/skills`）都指向 `~/.agents/skills`。
- 本機沒有任何工具會自動建 `graphify-out/`；那是使用者的決定（`/graphify` 跑出來才有）。
