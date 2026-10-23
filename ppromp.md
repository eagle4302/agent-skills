<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Jev（能使用就使用）

只要一個判斷可以寫成「從固定選項挑一個／是非題／給分或排序」，就先問 Jev 再往下做，不要為了省一步自己猜。例：該用哪個工具或 skill、這東西放哪個資料夾、這張票算不算完成、這件事難度幾分、這批項目各屬哪一類。

- 呼叫：Windows／DSH 跑 `~/.dsh/jev-dsh.ps1 -Request '<JSON>'`（JSON 很長或含單引號就改成 `-Path <檔案>`）；這支腳本不存在才退回 `curl` POST `https://api.typesafe.ai/v1/systemone`。請求是 `{state, model:"jev-latest", questions:{...}}`，格式細節照 `context-first` skill 的 Jev 段。
- key 先看 `$env:TYPESAFE_API_KEY`；process 環境是空的（DSH 很常見，key 只在 User 範圍）就取 `[Environment]::GetEnvironmentVariable('TYPESAFE_API_KEY','User')`。這條路 2026-10-23 實測 HTTP 200 可通。
- 回報挑選結果與 `confidence`：≥ 0.6 就照它做；< 0.6、`noul` 機率貼近 0.5、或呼叫失敗 → 自己決定並明講，重要選擇再問使用者。
- Jev 不可用（沒腳本、沒 key、連線失敗）就直說「Jev 這次沒能問」，然後自己判斷；不要假裝問過。
- 不交給 Jev：程式設計、除錯、多步推理，以及任何安全、風險、破壞性操作、部署或上線的決定。
- 批次分類（大量檔案／票／test 要貼同一組標籤）照 `context-first` 的批次規則：先剔除規則可直接判定的，再一次一題、每題 `instructions` 指名自己的項目。

## Recap（每次回覆結尾）

每一輪回覆的最後，固定附上一個 `## Recap`，範圍是「整個專案／整段對話目前的狀態」，不只是這一輪做了什麼。

格式：**最多 4 行**，每行一句白話，不用術語、不放程式碼或檔案清單。

- 目標：這個專案在做什麼
- 進度：目前做到哪、哪些已完成
- 卡點：在等什麼或卡在哪（沒有就整行省略）
- 下一步：接下來要做什麼

規則：

- 每一輪都要附；簡單問答縮成 1–2 行。
- 只寫已驗證的事實；沒驗證的標「未驗證」。
- 接續前一輪的 Recap 更新，不要每次從零重寫。
- 放在回覆最底部，前面用 `---` 分隔。
