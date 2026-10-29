---
name: freecad-cad
description: >-
  Local CAD with FreeCAD as the verification and post-processing back end: drive
  FreeCAD through freecad-mcp over MCP (execute_code, get_view, FEM, TechDraw) and
  bridge text-to-cad/cadgen build123d models in and out as STEP. Use when a CAD task
  needs FreeCAD-side work — OCCT-native part building (lofts, blades, fillets,
  booleans), invalid-solid debugging, STEP/STL export and round-trip checks,
  volume/bounding-box verification, screenshots, FEM or drawings — or when verifying
  or post-processing a text-to-cad model.
  中文觸發：FreeCAD、freecad-mcp、text-to-cad、cadgen、實體建模、封閉實體、
  STEP 往返、有限元素、工程圖。
---

# FreeCAD 中心的三工具 CAD 流程

```text
需求
 ├─ A 路線：text-to-cad（cadgen／build123d）──run──▶ 引擎文件 ──export──▶ STEP/STL/3MF
 └─ B 路線：FreeCAD 原生（Part API，經 freecad-mcp execute_code）──▶ FCStd + STEP/STL
                                   │
                     STEP 過橋 ◀───┘
                                   ▼
              FreeCAD 驗證／後處理（MCP：幾何檢查、FEM、TechDraw、截圖）
                                   ▼
                  交付：STEP / STL / FCStd / 圖面 / 驗證報告
```

- `$cad` 技能擁有 build123d 模型契約、專案佈局、cadgen 指令與版本 pin；本技能只補 **FreeCAD 層與檔案過橋**。
- FreeCAD 與 cadgen 各有 Python（3.11 vs 3.12/3.13）；**唯一溝通方式是檔案**（STEP/STL/3MF/GLB）。
- 幾何真相在可重跑的腳本；`.FCStd` 是工作檔、`.STEP/.STL` 是輸出，都當產物看。

工具名省略 host 前綴；DSH／Claude Code 顯示成 `mcp__freecad__execute_code` 這種形式。
技能檔案路徑相對於 skill base dir（載入時提供）；下面用 `<skill>/` 代表它。

## 先選路線（動手前先寫一句）

| 路線 | 何時用 | 起手 | 代價 |
| --- | --- | --- | --- |
| **A. cadgen／build123d** | 參數化、規則幾何（板、軸、殼、齒輪、支架）、組裝、2D DXF、要 viewer 即時預覽 | 讀 `$cad`，專案放 `projects/<name>/src/*.py` | 非規則自由曲面（螺旋槳葉片、複雜 blend）容易跟 kernel 打架 |
| **B. FreeCAD 原生 Part API** | 直接操作 OCCT（periodic B-spline loft、逐段驗證的複雜布林、非規則葉片）；要 `App::VarSet`、FCStd 交付、TechDraw／FEM | 寫 `projects/<name>/build_<part>.py`，用 `runpy` 載入（見 `<skill>/references/freecad-native.md`） | 沒有 viewer；每步自行驗證；GUI 執行緒與 timeout 風險 |
| **A+B hybrid** | A 建模、B 驗證／FEM／出圖；或 B 建複雜件、A 拿去組裝 | STEP 過橋（見 `<skill>/references/text-to-cad-bridge.md`） | 多一次往返與檔案管理 |

判斷例：

- 「80×50×6 板，四角 R5、中央 Ø20」→ A。
- 「螺旋槳葉片，16 個 NACA 截面 loft，根部 R2.5 倒角」→ B（`projects/propeller/build_propeller.py` 是活範例）。
- 「cadgen 做的零件要跑 CalculiX」→ A 建模，STEP 過橋，B 跑 FEM。
- 「外購馬達 STEP + 自製法蘭檢查干涉」→ B（FreeCAD 匯入兩者做 boolean／距離）。
- 「要給工廠的 PDF 工程圖」→ 先 A 或 B 建好，再 B 出圖；帶尺寸標註的 PDF 用 `$engineering-drawing`。

**完成條件**：回答裡有一句「本任務走 X，因為 Y」，且 X 的起手檔已建立（A）或 `$cad` 已讀（B 不需要
cadgen，但仍要確認沒誤用 A 的流程）。

## Preflight（只查本路線需要的）

| 路線 | 檢查 | 通過條件 |
| --- | --- | --- |
| A | `cadgen +0.8.1 doctor` | 退出碼 0；輸出有 `kernel` `OK`、`server running, pid …` |
| B / hybrid | 上列＋FreeCAD RPC | `get_rpc_status` 的 `rpc_server: "running"`；`gui_dispatch.state` 是 `healthy` 或短暫 `busy`；`version_check: "ok"` |
| B / hybrid | headless 可用性 | 跑一次 `execute_code_headless("print('ok')")`；若回 `freecadcmd not found`，照 playbook 設定 `--freecadcmd` |

- FreeCAD 掛掉時：A 路線照走（只交付 STEP）；B 路線可先用 `FreeCAD\bin\FreeCADCmd.exe` 離線驗證幾何，
  RPC 恢復後再補 MCP 的截圖與文件操作。
- 版本：addon 與 MCP server 要一致；`version_check` 由 MCP 層提供（addon 的 `get_rpc_status` 只給
  `addon_version`／`protocol_version`），不一致時照 playbook 更新。
- 邊界：FreeCAD 內建 Python 3.11，套件只裝在 cadgen 的 uv 環境；MCP server 由 uvx 獨立跑。

**完成條件**：本路線表格的每一列都有明確結果（通過，或已走 playbook 並記下替代方案）。

## 主迴圈（G1–G7）

1. **G1 需求表**：尺寸、單位（mm）、公差、材質、輸出格式、驗收數字；圖面缺的數字列成「假設」。
   **通過條件**：每個數字都有來源或標記為假設。
2. **G2 建模**：走 A 或 B；每完成一個布林／fillet／loft 就驗一次（`isValid()`、solid 數、體積）。
   **通過條件**：`isValid() == True`、solids 數符合預期、bbox 與規格相符（±0.01 mm 或相對 1e-6）。
3. **G3 幾何健檢**：跑 `<skill>/scripts/validate_doc.py`（貼進 `execute_code` 或 headless），
   把 `OBJ {...}` 與 `SUMMARY` 輸出留在回報裡；降級（例如倒角做不出來）要記一句。
   **通過條件**：所有物件 `valid: true`、`solids` 符合預期；降級都有紀錄。
4. **G4 STEP 往返**：匯出 STEP → 在**新文件**匯入 → 比對體積與 bbox。
   - 基準體積：A 路線取 `cadgen +0.8.1 inspect <id>` 輸出的 `volume`；B 路線取**匯出前**的 `shape.Volume`。
   - **通過條件**：相對誤差 < 1e-6、bbox 三個邊長一致（比較碼見 `<skill>/references/text-to-cad-bridge.md`）。
5. **G5 視覺**：`get_view` 取 Isometric 與特徵方向（Top/Front）；直接看回傳的圖判斷。
   **通過條件**：零件在畫面內且填滿合理比例、bbox 長寬比符合規格、需求指定的特徵（孔、倒角、葉片、
   凸台）都看得見；需要留檔才 `view.saveImage`。
6. **G6 交付**：寫出要求的檔案＋回報表（規格 vs 實測）＋降級與假設。
   **通過條件**：檔案存在、大小合理、報告每個驗收數字都有對應實測。
7. **G7 選配**：FEM 與 TechDraw（`<skill>/references/fem-and-drawings.md`）；製造性用 `$dfm`／`$dfam-check`。
   **通過條件**：FEM 與解析解同數量級（ratio 0.5–2）；圖面尺寸可追溯回模型。

## 執行模式與時間預算

| 模式 | 工具 | 用在哪 | 注意 |
| --- | --- | --- | --- |
| 一般 | `execute_code` | 建文件、布林、匯出、量測（< 90 s） | 參數：`code`、`include_screenshot`、`view_name`、`timeout`（≤ 1800） |
| 重幾何 | `execute_code_async` | 與文件/視圖無關的純 OCCT 計算 | 回 `job_id`；文件/視圖操作走 `commit(fn)`；狀態用 `get_async_status` |
| 會 crash | `execute_code_headless` | loft、sweep、螺紋、多 B-spline 布林 | 另開 `freecadcmd`（需 PATH 或 `--freecadcmd`）；自己開檔存檔；存完 `reload_document` |
| 截圖 | `get_view` | 交付前視覺確認 | `view_name`、`width`、`height`、`focus_object` |

- 中間步驟帶 `include_screenshot: false`，G5 再截圖。
- GUI 操作是 FIFO：一次送一個；排隊不縮短總時間。
- 把逾時當設計訊號：先量時間，再選 async／headless 或簡化幾何（細節在 `<skill>/references/mcp-lifecycle.md`）。

## 失敗 playbook

| 症狀 | 先查 | 處理 |
| --- | --- | --- |
| 所有 MCP 工具 timeout | `Get-Process freecad` 的 `Responding`；9875 是否 listen；`<skill>/scripts/rpc_health.py` | `Responding=False`：請使用者關掉對話框／用 launcher 重啟；MCP 層問題：重啟 agent session |
| `get_rpc_status` 回 `busy` | `gui_dispatch.operation` | 正常（有操作在跑），等它變 `healthy` 再送下一個；`stuck` 才走重啟 |
| `GUI_DISPATCH_STUCK` | `get_rpc_status.gui_dispatch` | 等目前操作結束；狀態不恢復 healthy 就重啟 FreeCAD |
| RPC 沒開（9875 拒絕連線） | 是否用 `start-freecad.cmd` 啟動 | 用 launcher 重開，或 MCP Addon → Start RPC Server |
| 重啟 FreeCAD 後工具一直失敗 | MCP server 是否握著舊連線 | 重啟 agent session，讓 `uvx freecad-mcp` 重新 spawn |
| `execute_code_headless` 回 `freecadcmd not found` | 可攜版不在 PATH | MCP client 的 args 加 `--freecadcmd "C:/…/FreeCAD/bin/FreeCADCmd.exe"`，重啟 client |
| fillet 後 `isValid()=False` | `shape.check()`（可能拋 `Unorientable shape`） | 丟棄這次結果、回上一步；照 `<skill>/references/freecad-native.md` 的降級階梯 |
| 布林後 solids 變多、體積跳動 | 每階段的 volume/solids | `removeSplitter()` 後重驗；無效就重做該布林或調順序 |
| 幾何超過 90 s | 操作耗時 | `execute_code` 帶 `timeout`；或 async／headless |
| FreeCAD 內 `ModuleNotFoundError` | FreeCAD Python 3.11 | 改寫成 stdlib 或走 cadgen；套件只裝 uv 環境 |
| `cadgen snapshot` 回 `OCCT could not hand its picture over` | 是否正是這個錯誤 | 本機離屏截圖不可用：改用 FreeCAD `get_view`／`view.saveImage` |
| FreeCAD log 出現 `Part.insert` 棄用 | 匯入 STEP 的方式 | 改用 `ImportGui.insert(path, doc_name)` |
| Windows MCP client `EFTYPE`／`uv_spawn` | client 設定 | 改 `["cmd", "/c", "freecad-mcp"]`（配 `freecad-mcp.exe` 絕對路徑） |
| `version_check` 不一致 | `get_rpc_status` | 更新 addon（重啟 FreeCAD）或更新 `uvx freecad-mcp` |

## FreeCAD 原生建模規則（摘要）

- **文件生命週期**：只關自己建的；關使用者文件前先問。固定 doc 名稱，開頭先移除同名舊文件。
- **座標**：mm；檔案開頭寫軸向約定（例：`+Z = shaft axis`）。
- **驗證節奏**：每個布林／fillet／loft 後驗 `isValid()`、`len(Solids)`、`Volume`；無效就回滾。
- **fillet 階梯**：候選邊按幾何條件篩（半徑、z 範圍、長度）→ 半徑由大到小 → 只接受 `isValid()` → 失敗記降級。
- **參數化**：模組常數＋需要時 `App::VarSet`；FCStd 樹上看得到設計參數。
- **載入方式**：長腳本用 `runpy.run_path(..., run_name="not_main")` 呼叫，不要整段貼進 `execute_code`。
- **命名空間**：`execute_code` 的變數跨呼叫保留；每個任務用自己前綴（`prop_`、`plate_`），避免接手上一個任務的 `body`。
- 完整片段：`<skill>/references/freecad-native.md`。

## text-to-cad 過橋（摘要）

- 指令、版本 pin、模型契約、專案佈局都在 `$cad`；這裡只記過橋差異。
- 交棒：`cadgen export <id> STEP/<name>.step` → `ImportGui.insert(...)`；反向用 `Part.export` + `read_step`。
- 格式邊界：`.xbf` 只有 cadgen 讀；`.FCStd` 只有 FreeCAD 讀；交換一律 STEP/STL/3MF/GLB。
- 細節與 compare 程式碼：`<skill>/references/text-to-cad-bridge.md`。

## 交付與回報

- 來源檔：A 路線 `projects/<name>/src/*.py`；B 路線 `projects/<name>/build_<part>.py`。
- 輸出：`STEP/`、`STL/`（gitignore）、需要時 `docs/images/*.png`。
- 回報三段：① 路線＋模型＋檔案路徑；② 驗證表 `項目 | 規格 | 實測 | 判定`（bbox、體積、valid、往返誤差、FEM）；
  ③ 假設與降級（哪些數字是假設、哪些特徵被簡化）。
- 產出檔留在工作區，不進 commit；`FCStd` 只當工作檔，交付以 STEP/STL 為主。

## References

- `<skill>/references/freecad-native.md` — FreeCAD 原生建模、驗證片段、VarSet、匯出、截圖。
- `<skill>/references/mcp-lifecycle.md` — 啟動與健康檢查、工具參數、async/headless、卡死復原。
- `<skill>/references/text-to-cad-bridge.md` — STEP 進出、往返比較、格式邊界。
- `<skill>/references/debugging-occt.md` — invalid solid 分級排查、階段 log、真實失敗矩陣。
- `<skill>/references/fem-and-drawings.md` — CalculiX FEM 與 TechDraw。
- `<skill>/scripts/rpc_health.py` — MCP 工具 timeout 時直探 XML-RPC。
- `<skill>/scripts/validate_doc.py` — 列出所有物件的 valid/體積/bbox（G3 用）。
