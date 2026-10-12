<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

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
