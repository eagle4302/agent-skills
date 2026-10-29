# freecad-mcp 生命週期與執行模式

讀這份的時機：RPC 連不上、工具 timeout、要跑重幾何、或重啟 FreeCAD 之後。
技能正文只保留「先查什麼」；這份是完整判讀與參數。

## 拓撲

```text
agent host（DSH／Claude Code）
   │ MCP over stdio
   ▼
uvx freecad-mcp ──XML-RPC http://127.0.0.1:9875──▶ FreeCAD GUI
                                                     └─ FreeCADMCP addon（RPC server）
```

- MCP server 由 agent host 啟動（`uvx freecad-mcp`），不是常駐服務；agent session 重啟就重新 spawn。
- RPC server 在 FreeCAD 內，由 addon 提供；設定存在 `<userData>/freecad_mcp_settings.json`。
- 兩者分開死：FreeCAD 卡死 ≠ MCP server 壞；MCP client 壞也 ≠ FreeCAD 掛。

## 啟動與健康檢查

1. 啟動 FreeCAD：工作區有 `start-freecad.cmd` 就用它（設 `FREECAD_USER_HOME`）；沒有就用系統 FreeCAD。
2. 等 RPC：`Test-NetConnection 127.0.0.1 -Port 9875` 變 True（通常 2–20 秒）。
3. MCP 層：`get_rpc_status` → `rpc_server: running`、`gui_dispatch.state` 可接受、`version_check: ok`。
4. 卡住時的外部探針：`<skill>/scripts/rpc_health.py`（只依賴 stdlib，不經 MCP）。

`gui_dispatch` 三態（addon `dispatch_health.py`）：

| state | 意義 | 判讀 |
| --- | --- | --- |
| `healthy` | 目前沒有 GUI 操作 | 正常 |
| `busy` | 有操作正在跑（含 async job） | **正常**，等它結束；看 `operation`／`running_for_seconds` |
| `stuck` | 操作超過執行預算 | 異常，走卡死復原 |

`async_jobs_running` 列出背景工作。`version_check` 只在 MCP 層提供；addon 的 `get_rpc_status` 給的是
`addon_version` 與 `protocol_version`。

## 工具清單（17 個）

| 類別 | 工具 | 用途 |
| --- | --- | --- |
| 文件 | `create_document`、`list_documents`、`reload_document` | 開新文件、列文件、重載外部改過的檔 |
| 物件 | `create_object`、`edit_object`、`delete_object`、`get_object`、`get_objects` | 泛型 property 建立/編輯；支援 `Part::`、`PartDesign::`、`Fem::` 等 |
| 執行 | `execute_code`、`execute_code_async`、`get_async_status`、`execute_code_headless` | 見下一節 |
| 檢視 | `get_view` | 截圖（9 種視角、`width`/`height`/`focus_object`） |
| 零件庫 | `insert_part_from_library`、`get_parts_list` | FreeCAD parts library |
| FEM | `run_fem_analysis` | 對既有 `Fem::FemAnalysis` 跑 CalculiX |
| 診斷 | `get_rpc_status` | 版本、dispatch 健康、背景工作 |

### create_object 的 MCP 參數

MCP 介面（不是 addon 的 XML-RPC payload）：

```json
{
  "doc_name": "MyDoc",
  "obj_type": "Part::Box",
  "obj_name": "Body",
  "analysis_name": null,
  "obj_properties": {"Length": 60, "Width": 40, "Height": 8}
}
```

- `analysis_name` 只在 FEM 物件需要。
- `obj_properties` 是 property 字典；`References` 用現行 dict 形式：

```json
{"References": [{"object_name": "Beam", "face": "Face1"}]}
```

tuple／list 形式（`[["Beam", "Face1"]]`）只為相容舊呼叫而保留。
- `Part::` 以外的 C++ 註冊型別走 `execute_code` 建。

## 三種執行模式

| 模式 | 適用 | 回傳 | 限制 |
| --- | --- | --- | --- |
| `execute_code(code, include_screenshot, view_name, timeout)` | 一般 GUI 操作 | 執行輸出＋可選截圖 | 預設 90 s；`timeout` 最大 1800；FIFO 一次一個 |
| `execute_code_async(code)` | 純 OCCT 重計算（不碰文件/視圖） | `job_id` | 文件/視圖只能經 `commit(fn)`；`get_async_status(job_id)` 查狀態 |
| `execute_code_headless(code, timeout)` | 會 crash 或超久的幾何 | 退出碼＋stdout | 另開 `freecadcmd` 程序；**不共享**命名空間；檔案路徑要在本機 |

預算：`execute_code` 的排隊與執行各一個 budget，client socket timeout 至少 `2*timeout+30` 秒。
超時回報時工作**仍在跑**、結果會被丟棄；重送前先看 `get_rpc_status` 是否還顯示該操作。

### async + commit

```python
# execute_code_async 的內容：先算 shape（背景執行緒安全），再交回 GUI
fused = base.fuse(addition).removeSplitter()

def apply():
    doc = FreeCAD.getDocument("MyPart")
    doc.getObject("Body").Shape = fused
    doc.recompute()

commit(apply)
```

`commit()` 只在 async 程式碼裡可用；在 `execute_code` 或 GUI callback 裡呼叫會丟 `RuntimeError`。

### headless + reload

`execute_code_headless` 用 `freecadcmd -c` 跑另一個程序：要自己 `openDocument`／`saveAs`，不共享
`execute_code` 的變數。存回 GUI 也開著的檔案後，用 `reload_document(doc_name)` 讓 GUI 重讀。

可執行檔的尋找順序（`src/freecad_mcp/headless.py`）：PATH 上的 `freecadcmd`／`FreeCADCmd`／
`freecadcmd.exe`／`freecad.cmd`，再找 Flatpak。可攜版通常不在 PATH，所以要在 MCP client 的啟動參數指定：

```json
{"command": "uvx", "args": ["freecad-mcp", "--freecadcmd", "C:/…/FreeCAD/bin/FreeCADCmd.exe"]}
```

沒設定時會回 `freecadcmd not found: install FreeCAD, or pass --freecadcmd to freecad-mcp`。
`--freecadcmd` 的值是**一個字串**（可用 `shlex` 風格的引號帶參數，例如 Flatpak 指令）。

## 卡死復原決策樹

```text
工具 timeout？
├─ FreeCAD 進程還在 → Get-Process freecad 看 Responding
│  ├─ Responding=False（modal 對話框或 GUI 當掉）
│  │   ├─ 視窗有對話框（recovery/存檔/錯誤）→ 請使用者處理
│  │   └─ 沒有對話框、CPU 一直燒 → 使用者同意後關閉/重啟 FreeCAD
│  └─ Responding=True
│      ├─ get_rpc_status 回 gui_dispatch=stuck → 等操作結束；不恢復就重啟
│      ├─ get_rpc_status 回 busy → 正常，等它結束
│      └─ 9875 沒開 → MCP Addon → Start RPC Server，或 launcher 重開
└─ 進程不在 → 用 start-freecad.cmd 重開，等 9875，再 get_rpc_status
```

- FreeCAD 無回應時先看 `gui_dispatch`，再決定要不要重送；連續重送只會把佇列塞滿。
- 重啟 FreeCAD 後 MCP server 可能握著舊連線；工具持續失敗時重啟 agent session。
- 重啟前確認沒有未存檔文件；`list_documents` 只在 GUI 健康時答得出來。

## 安全與邊界

- RPC 預設只綁 loopback；`remote_enabled=false`。要遠端連線時先看上游的 token／allowed IP 章節。
- `execute_code` 在 FreeCAD 裡有完整權限（可讀寫檔案、跑系統指令）；只執行你能解釋的程式碼。
- 套件只裝在 cadgen 的 uv 環境；FreeCAD 的 Python 3.11 保持乾淨。
- Windows 上 MCP client 若報 `EFTYPE`／`uv_spawn`，把設定改成 `["cmd", "/c", "freecad-mcp"]`
  （必要時用 `freecad-mcp.exe` 絕對路徑）。
