# FreeCAD 原生建模（Part API，經 freecad-mcp）

讀這份的時機：走 B 路線（需要直接操作 OCCT），或要修 FreeCAD 內已有的文件。
`$cad` 的 build123d 路線不適用這裡；兩者不混在同一個程序。

## 執行骨架

`execute_code` 在 FreeCAD 的 GUI 執行緒跑，共享一個持久命名空間（`FreeCAD`/`App`、`FreeCADGui`/`Gui`）。
變數會跨呼叫保留，所以**每個任務用自己的前綴**（`prop_`、`plate_`），避免默默接手上一個任務的 `body`。

長腳本（> 50 行）放成 `projects/<name>/build_<part>.py`，用 `runpy` 載入，而不是整段貼進工具：

```python
import runpy
mod = runpy.run_path(r"C:\…\projects\propeller\build_propeller.py", run_name="not_main")
prop, blade, tries = mod["build_propeller"]()
```

短腳本可以直接寫在 `execute_code`：

```python
import os
import FreeCAD as App
import Part
from FreeCAD import Vector

DOC_NAME = "MyPart"

if DOC_NAME in [d.Name for d in App.listDocuments().values()]:
    App.closeDocument(DOC_NAME)
doc = App.newDocument(DOC_NAME)
doc.Label = "MyPart"
```

建物件、給 shape、設定顯示：

```python
obj = doc.addObject("Part::Feature", "Body")
obj.Shape = shape
obj.Label = "Body"
obj.ViewObject.ShapeColor = (0.78, 0.80, 0.84)
doc.recompute()
```

存檔與匯出（GUI 執行緒）：

```python
doc.saveAs(os.path.join(OUT_DIR, "MyPart.FCStd"))
Part.export([doc.getObject("Body")], os.path.join(OUT_DIR, "MyPart.step"))
import Mesh
Mesh.export([doc.getObject("Body")], os.path.join(OUT_DIR, "MyPart.stl"))
```

## 驗證片段（每個 kernel 操作後都跑）

```python
def report(shape, label):
    try:
        check = shape.check()          # 無效 shape 會拋 ValueError: Unorientable shape
        check_msg = "ok" if check is None else str(check)
    except Exception as exc:           # noqa: BLE001 - check() 用例外回報
        check_msg = "EXC: %s" % exc
    bb = shape.BoundBox
    print("VERIFY %-12s valid=%-5s solids=%d faces=%d vol=%.3f bbox=%.3f,%.3f,%.3f check=%s"
          % (label, shape.isValid(), len(shape.Solids), len(shape.Faces),
             shape.Volume, bb.XLength, bb.YLength, bb.ZLength, check_msg))
    return shape.isValid()
```

- `isValid()` 是門檻，不是參考值；False 就丟掉這次結果。
- `check()` 正常回 `None`；可能回字串或拋例外，兩種都要接。
- `len(shape.Solids)` 與體積一起看：布林把兩個實體留成兩個、或體積突然變大，通常是拓樸沒收乾淨。
- G3 要一次列出所有物件時，跑 `<skill>/scripts/validate_doc.py`（貼進 `execute_code` 或 headless）。
- 重要階段寫檔（GUI 卡住時 `print` 會消失）；寫法見 `<skill>/references/debugging-occt.md`。

## 幾何配方

### 1. 板類零件（box + fillet + cut）

```python
body = Part.makeBox(80, 50, 6, Vector(-40, -25, 0))
body = body.makeFillet(5.0, [e for e in body.Edges if abs(e.tangentAt(0).z) > 0.99])
bore = Part.makeCylinder(10, 20, Vector(0, 0, -7), Vector(0, 0, 1))
body = body.cut(bore).removeSplitter()
```

邊選取用幾何條件（方向、半徑、z 範圍、長度）；索引會隨操作改變。

### 2. 葉片類（periodic B-spline 截面 + loft）

自由曲面件（螺旋槳、翼型、葉輪）走 B 路線。每個截面是一條**封閉 periodic B-spline**，
loft 出來才是一整片平滑曲面：

```python
import math
import Part
from FreeCAD import Vector

def section_wire(r, chord, thickness_ratio, pitch):
    n = 24
    xs = [0.5 * (1.0 - math.cos(math.pi * i / n)) for i in range(n + 1)]
    half = [5.0 * thickness_ratio * chord * (
        0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x ** 2
        + 0.2843 * x ** 3 - 0.1036 * x ** 4) for x in xs]
    u = [(x - 0.5) * chord for x in xs]
    beta = math.atan(pitch / (2.0 * math.pi * r))
    cb, sb = math.cos(beta), math.sin(beta)

    def p3(ui, vi):
        return Vector(ui * cb - vi * sb, r, ui * sb + vi * cb)

    pts = [p3(u[i], half[i]) for i in range(n + 1)]
    pts += [p3(u[i], -half[i]) for i in range(n - 1, 0, -1)]
    curve = Part.BSplineCurve()
    curve.interpolate(pts, PeriodicFlag=True)
    return Part.Wire([curve.toShape()])

wires = [section_wire(s * 120.0, chord, tr, 180.0) for s, chord, tr in SECTIONS]
blade = Part.makeLoft(wires, solid=True, ruled=False, closed=False)
```

截面參數放模組常數；`SECTIONS` 用 `(r/R, chord, thickness_ratio)`，最後一兩段收小讓 tip 收斂。

多葉片組裝時 `Shape.rotate()` 是**原地**修改，每片先 `copy()`：

```python
prop = hub
for i in range(n_blades):
    piece = blade.copy().rotate(Vector(0, 0, 0), Vector(0, 0, 1), 360.0 * i / n_blades)
    prop = prop.fuse(piece)
prop = prop.removeSplitter()
```

### 3. fillet 降級階梯（本技能唯一出處）

OCCT 對「倒角幾何條件不足」會回無效實體而不是例外，所以每階都要驗：

```python
def try_fillet(shape, edges, radii=(2.5, 2.0, 1.5, 1.0)):
    for r in radii:
        try:
            got = shape.makeFillet(r, edges)
        except Exception as exc:   # noqa: BLE001 - OCCT 用例外拒絕
            print("fillet r=%.1f EXC %s" % (r, exc))
            continue
        if got.isValid():
            print("fillet r=%.1f OK on %d edges" % (r, len(edges)))
            return got, "fillet %.1f on %d edges" % (r, len(edges))
    print("fillet skipped: keep sharp joint")
    return shape, "sharp joint (fillet refused)"
```

順序：先全邊 → 只取夠長的邊 → 只取幾何條件吻合的邊 → 降半徑 → 接受尖角。
**只接受 `isValid()` 的結果**；`makeFillet` 回傳無效形狀時體積變大是假象，不能當成功指標。

### 4. 量測與干涉

```python
a = doc.getObject("PartA").Shape
b = doc.getObject("PartB").Shape
dist = a.distToShape(b)[0]                  # 最近距離（0 = 接觸或干涉）
overlap = a.common(b).Volume                # 干涉體積；非 0 就是真的重疊
print("DIST=%.4f OVERLAP=%.4f" % (dist, overlap))
```

裝配規則：`overlap == 0`（除設計上的配合面）；「貼著」用距離 0 判定。

## 參數化：VarSet

```python
vs = doc.addObject("App::VarSet", "Parameters")
vs.addProperty("App::PropertyLength", "Diameter", "Design", "Overall diameter")
vs.addProperty("App::PropertyInteger", "BladeCount", "Design", "Number of blades")
vs.Diameter = 240.0
vs.BladeCount = 3
```

FCStd 樹上看得到設計參數；腳本裡的模組常數仍是幾何真相，兩邊數值要一致。

## 截圖

```python
import FreeCADGui as Gui
view = Gui.getDocument(doc.Name).ActiveView
view.viewIsometric()
Gui.SendMsgToActiveView("ViewFit")
view.saveImage(r"C:\…\docs\images\part-isometric.png", 1600, 1100, "White")
view.viewTop()
Gui.SendMsgToActiveView("ViewFit")
view.saveImage(r"C:\…\docs\images\part-top.png", 1600, 1100, "White")
```

或直接用 MCP `get_view`（`view_name`、`width`、`height`、`focus_object`）；中間步驟不截圖。

## 跑法

- **GUI 執行緒**：`execute_code`；< 90 s 的操作直接跑。
- **重幾何／會 crash**：`execute_code_async` 或 `execute_code_headless`；模式選擇與 timeouts 見
  `<skill>/references/mcp-lifecycle.md`。
- **完全沒有 MCP**（FreeCAD 卡死）：`FreeCAD\bin\FreeCADCmd.exe script.py` 可離線驗證幾何
  （先設 `FREECAD_USER_HOME`）。

## 匯入外部 STEP（組裝／干涉檢查）

`ImportGui.insert(path, doc_name)`，片段在 `<skill>/references/text-to-cad-bridge.md`（該檔擁有過橋程式碼）。
匯入後一樣跑驗證片段；每個匯入物件都是 `Part::Feature`。
