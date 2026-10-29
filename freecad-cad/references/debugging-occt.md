# OCCT 幾何除錯（invalid solid、fillet 失敗、效能）

讀這份的時機：`isValid()=False`、`check()` 拋 `Unorientable shape`、fillet/loft 回例外或無效、
或布林後結果怪怪的。核心原則：**每個 kernel 操作後驗，無效就回滾，讓壞形狀停在原地。**

## 分級排查

| 等級 | 跡象 | 意義 | 動作 |
| --- | --- | --- | --- |
| 1 | `makeFillet` 拋 `StdFail_NotDone` | OCCT 直接拒絕（幾何條件不足） | 換半徑／換邊集合／降級 |
| 2 | `isValid()=False` 但沒有例外 | 回傳了壞形狀（最危險：不會中斷流程） | 丟棄這次結果，保留上一個有效 shape |
| 3 | `check()` 拋 `Unorientable shape` | 面方向不一致（常見於壞 fillet/loft 後） | 同 2；回滾比修補便宜 |
| 4 | solids 數變多／體積跳動 | 布林沒收乾淨、重疊面 | `removeSplitter()` 後重驗；重做布林或調順序 |
| 5 | 匯出 STEP 後匯入掉面 | sliver／self-intersection | 回模型簡化；用 `check()` 找源頭 |

實測案例（`projects/propeller`，80 條根部候選邊）：

| 候選邊 | 半徑 | 結果 |
| --- | --- | --- |
| 全 80 條 | 2.5 / 2.0 / 1.5 | 都回 `valid=False`（faces 186、體積變大） |
| 長度 ≥ 2 mm（32 條） | 2.5 / 2.0 / 1.5 | 拋 `StdFail_NotDone` |
| 長度 ≥ 5 mm（0 條） | — | 拋 `Null input shape`（空集合） |
| — | — | 最終接受尖角接合，並記錄降級 |

這說明了兩件事：無效結果的體積變大是假象；候選邊集合空掉要先擋。降級階梯的程式碼在
`<skill>/references/freecad-native.md`（本技能唯一出處）。

## 階段紀錄（headless-safe）

GUI 執行緒卡住時 `print` 會消失；每個階段寫檔，失敗時才知道停在哪：

```python
import traceback

LOG = r"C:\path\project\_debug.log"
_lines = []

def log(msg):
    _lines.append(str(msg))
    with open(LOG, "w", encoding="utf-8") as fh:
        fh.write("\n".join(_lines))

stage = "start"
try:
    stage = "blade"
    blade = build_blade()
    log("blade valid=%s vol=%.2f faces=%d" % (blade.isValid(), blade.Volume, len(blade.Faces)))

    stage = "hub"
    hub = build_hub()
    log("hub valid=%s vol=%.2f" % (hub.isValid(), hub.Volume))

    stage = "fuse"
    prop = hub
    for i in range(3):
        piece = blade.copy().rotate(Vector(0, 0, 0), Vector(0, 0, 1), 120.0 * i)
        prop = prop.fuse(piece)
        log("fuse %d valid=%s solids=%d vol=%.2f" % (i, prop.isValid(), len(prop.Solids), prop.Volume))
except Exception:
    log("FAILED at %s\n%s" % (stage, traceback.format_exc()))
    raise
```

分段的好處：`_debug.log` 直接指出「fillet 後才壞」還是「loft 本身就壞」；修的時候只重跑壞的那段。

## 邊選取的穩定寫法

邊索引會隨操作改變；用幾何條件：

```python
# 垂直於 Z 的邊（板的四角）
vertical = [e for e in shape.Edges if abs(e.tangentAt(0).z) > 0.99]
# 落在半徑 R 的圓柱面上
on_cylinder = [e for e in shape.Edges
               if all(abs(math.hypot(p.x, p.y) - R) < 0.15 for p in e.discretize(11))]
# 排除上下端面
mid = [e for e in on_cylinder
       if not any(abs(abs(p.z) - H) < 0.2 for p in e.discretize(11))]
```

容差（`< 0.15`、`< 0.2`）隨模型尺度調整；先用 `e.discretize(11)` 印幾個點確認。

## 修補與簡化（照順序）

1. `removeSplitter()`：合併共面分割（布林後必做）。
2. 以 `shape.fuse(...).removeSplitter()` 取代多次小布林，或先把工具形狀 fuse 再一次 cut。
3. 調整截面／間距：loft 扭曲常是相鄰截面扭轉方向不一致（periodic wire 起點要對齊）。
4. `sewShape()`／`refine` 只在明確知道要修什麼時用；不確定就回上一步。
5. 最後手段：拆成多個有效實體（零件分件）或在接合處留尖角，交付時說明。

## check() 的語義

- 正常回 `None`；有問題時回字串或**拋例外**（`ValueError: Unorientable shape`）。
- 兩條路都接（`try/except`），再判斷 `isValid()`。
- `isValid()` 只保證 B-Rep 自洽，不保證匯出/匯入不掉東西；G4 往返仍要跑。

## 效能

- `makeLoft` 16 截面 + periodic B-spline：秒級；`fuse` 3 片也在秒級（螺旋槳實測）。
- 真正的成本在 fillet 與大布林。超過 90 s 時，依 `<skill>/references/mcp-lifecycle.md`
  選 `timeout`、async 或 headless。
- 先用小腳本量時間（例如只做 blade 的 loft），再決定模式。

## 沒有 MCP 時的離線重現

FreeCAD 卡死也能驗幾何：直接跑 `freecadcmd`（先設 `FREECAD_USER_HOME` 指到隔離的 userdata）：

```powershell
$env:FREECAD_USER_HOME = "C:\path\userdata"
.\FreeCAD\bin\FreeCADCmd.exe .\projects\<name>\_diag.py
```

腳本裡用 `runpy.run_path(build_script, run_name="not_main")` 載入建模模組，
就能在獨立程序重現/縮小問題，不影響 GUI。
