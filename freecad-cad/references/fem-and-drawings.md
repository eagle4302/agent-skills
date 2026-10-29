# FEM 與工程圖（FreeCAD 後處理）

讀這份的時機：零件形狀已驗證完，要回答「撐不撐得住」或「給工廠一張圖」。
兩者都在 FreeCAD 內做；零件來源可以是 cadgen STEP（走過橋）或 FreeCAD 原生建模。

## FEM（CalculiX）

**用途**：結構 sanity check、和解析解對數量級、比較兩個設計——不是認證級分析。
**前提**：模型是有效單一實體；FreeCAD 可攜版已內建 CalculiX（`bin\ccx.exe`）。

### 物件圖

| 物件 | 型別 | 關鍵 property |
| --- | --- | --- |
| 幾何 | `Part::Box`／`Part::Feature` | `Shape` |
| 分析容器 | `Fem::AnalysisPython` | — |
| 材料 | `Fem::MaterialCommon` | `Material`: `{Name, Density, YoungsModulus, PoissonRatio}` |
| 網格 | `Fem::FemMeshGmsh` | `Shape`、`CharacteristicLengthMax`、`CharacteristicLengthMin` |
| 固定 | `Fem::ConstraintFixed` | `References` |
| 力 | `Fem::ConstraintForce` | `References`、`Direction`、`Force`（量字串，如 `"100 N"`） |

用 MCP `create_object` 建（參數是 `doc_name`／`obj_type`／`obj_name`／`analysis_name`／`obj_properties`）：

```json
{"doc_name": "FemDemo", "obj_type": "Fem::MaterialCommon", "obj_name": "Steel",
 "analysis_name": "Analysis",
 "obj_properties": {"Material": {"Name": "Steel", "Density": "7900 kg/m^3",
                                  "YoungsModulus": "210 GPa", "PoissonRatio": 0.3}}}
```

`References` 用現行 dict 形式：`[{"object_name": "Beam", "face": "Face1"}]`。
面編號不要靠 Box 的面列舉猜，用質心找：

```python
import FreeCAD
doc = FreeCAD.getDocument("FemDemo")
beam = doc.getObject("Beam")
fixed = next(i for i, f in enumerate(beam.Shape.Faces, start=1)
             if abs(f.CenterOfMass.x) < 1e-6)
loaded = next(i for i, f in enumerate(beam.Shape.Faces, start=1)
              if abs(f.CenterOfMass.x - 100.0) < 1e-6)
print("FACES fixed=Face%d loaded=Face%d" % (fixed, loaded))
```

力的方向與大小（quantity 與 link 屬性用 `execute_code` 設）：

```python
load = doc.getObject("Load")
z_edge = next(i for i, e in enumerate(beam.Shape.Edges, start=1)
              if abs(e.tangentAt(0).z) > 0.99)
load.Direction = (beam, ["Edge%d" % z_edge])
load.Reversed = True
load.Force = "100 N"
doc.recompute()
```

跑分析（GUI 執行緒，可能數十秒到數分鐘；timeout 上限 1800）：

```text
run_fem_analysis(doc_name="FemDemo", analysis_name="Analysis", timeout=600)
```

回傳 max von Mises（MPa）、max/min 位移（mm）、節點數、solver 工作目錄。
**完成條件**：`success` 為真；和解析解同數量級（ratio 0.5–2），比較寫進報告。

懸臂梁解析對照（100×10×10 mm、鋼 E=210 GPa、端點 100 N）：

```python
I = B * H**3 / 12.0
sigma = (F * L) * (H / 2) / I                      # MPa
delta = (F * L**3) / (3 * (E_GPa * 1000.0) * I)    # mm
```

預設網格是線性四面體，彎曲會偏硬；要更準就加密 `CharacteristicLengthMax` 或改二階元素。
結果不對時，依序檢查幾何、約束、單位，再懷疑網格。

## 工程圖（TechDraw）

**可離線用（freecadcmd 已驗證）**：

```python
import os
import FreeCAD as App

doc = App.getDocument("MyPart")
part = doc.getObject("Body")

page = doc.addObject("TechDraw::DrawPage", "Page")
template = doc.addObject("TechDraw::DrawSVGTemplate", "Template")
# 可攜版 resource dir 是 <FreeCAD>\data；用 getResourceDir() 組，不要寫死
template.Template = os.path.join(
    App.getResourceDir(), "Mod", "TechDraw", "Templates", "ISO", "A4_Landscape_TD.svg")
page.Template = template

view = doc.addObject("TechDraw::DrawViewPart", "View")
page.addView(view)
view.Source = [part]
view.Direction = (0, 0, 1)      # 上視；前視 (0,-1,0)、右視 (1,0,0)
doc.recompute()

import TechDraw
TechDraw.writeDXFPage(page, r"C:\…\drawings\part-top.dxf")
svg = TechDraw.viewPartAsSvg(view)     # SVG 字串，可自行寫檔
print("SVG_LEN", len(svg))
```

- 多視圖：建多個 `TechDraw::DrawViewPart`，各自 `page.addView(view)` 與不同 `Direction`。
- 尺寸標註與 PDF 走 GUI 工作台；帶尺寸的正式圖面用 `$engineering-drawing` 技能，2D 輪廓／雷切用 `$dxf`。
- 圖面完成條件：視圖方向正確、關鍵尺寸可追溯回模型、檔名／路徑寫進報告。

## 回報格式（FEM／圖面）

```text
FEM : 材質 Steel, E=210 GPa, mesh 5 mm linear tets
      σ_max 實測 142.3 MPa vs 解析 150.0 MPa (0.95x)   PASS
      δ_tip 實測 0.41 mm vs 解析 0.40 mm  (1.02x)      PASS
圖面: drawings\part-top.dxf, drawings\part-front.dxf（A4 橫式 ISO 模板）
```
