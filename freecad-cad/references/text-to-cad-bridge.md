# text-to-cad（cadgen）↔ FreeCAD 過橋

讀這份的時機：零件用 build123d 建、要進 FreeCAD 驗證/後處理；或 FreeCAD 建的件要回 cadgen 組裝。

cadgen 的安裝、`+0.8.1` 版本 pin、指令旗標、`@model` 契約、專案佈局都屬於 `$cad`；這裡只寫**過橋**：
檔案怎麼交棒、往返怎麼量、哪些格式過不去。

## 交棒 1：cadgen → FreeCAD（最常用）

cadgen 跑完會印 `id:`，用 `$cad` 的指令匯出 STEP，再匯入 FreeCAD：

```python
# freecad-mcp: execute_code（路徑換成實際專案）
import FreeCAD, ImportGui

STEP = r"C:\…\projects\demo-plate\STEP\mounting_plate.step"
DOC = "demo_plate_verify"

for d in list(FreeCAD.listDocuments().values()):
    if d.Name == DOC:
        FreeCAD.closeDocument(DOC)
doc = FreeCAD.newDocument(DOC)
ImportGui.insert(STEP, DOC)
doc.recompute()

for o in doc.Objects:
    bb = o.Shape.BoundBox
    print("IMPORT %s valid=%s solids=%d faces=%d vol=%.3f bbox=%.3f,%.3f,%.3f"
          % (o.Name, o.Shape.isValid(), len(o.Shape.Solids), len(o.Shape.Faces),
             o.Shape.Volume, bb.XLength, bb.YLength, bb.ZLength))
```

匯入一律用 `ImportGui.insert`（GUI 執行緒）；`Part.insert` 已棄用。
匯入後先跑 G4 往返比較，再進 G5 截圖。

## G4：STEP 往返比較（A 路線）

基準體積**不是** FreeCAD 匯入後才量的值（那會自己跟自己比）。A 路線用 cadgen 自己的量測：

```powershell
cadgen +0.8.1 inspect <id>
# 輸出含：bounds 80 x 50 x 6 mm, from (-40, -25, -3)
#         volume 21,308 mm^3
```

```python
baseline = 21308.0            # cadgen inspect 印出的 volume（整數 mm³，取輸出值）
imported = doc.Objects[0].Shape.Volume
rel = abs(imported - baseline) / baseline
print("ROUNDTRIP imported=%.3f baseline=%.3f rel_error=%.3e" % (imported, baseline, rel))
assert rel < 1e-6, "volume changed through STEP"
```

- 容差 1e-6（相對）；bbox 三個邊長誤差 < 1e-6 mm。
- 多實體零件逐一比 solids 數與各別體積。
- `inspect` 的體積是 3–5 位有效數字；若零件體積很小（< 100 mm³），先跟 cadgen 的 6 位以上來源核對，
  或改用 `export` 後在 FreeCAD 端做兩次獨立匯入互比。

B 路線（FreeCAD 原生）的 baseline 是**匯出前**的 `body.Volume`：

```python
baseline = body.Volume          # 匯出前的實測值（不是匯入後的值）
Part.export([obj], step_path)
# 新文件匯入後：
rel = abs(imported.Volume - baseline) / baseline
```

## 交棒 2：FreeCAD → cadgen（較少用）

FreeCAD 建的件（或修改後的件）匯出 STEP，讓 cadgen 當輸入組裝：

```python
Part.export([doc.getObject("Body")], r"…\STEP\part.step")
```

cadgen 端用 `read_step` 讀（路徑建議用 `__file__` 錨定）；STEP 只帶幾何、名稱、顏色、材質名稱，
`@memo`／joint／animation 不會過去，FreeCAD 的特徵歷史也不會。來回轉一次就當「凍結幾何」，
同一個零件只在其中一邊當來源。

## 格式邊界

| 格式 | cadgen | FreeCAD | 用途 |
| --- | --- | --- | --- |
| STEP | 讀（`read_step`）／寫 | 讀（ImportGui）／寫（Part.export） | **主要交換格式**，帶名字/顏色/材質名 |
| STL | 寫／讀 mesh | 讀／寫（Mesh） | 列印、mesh 檢查 |
| 3MF | 寫 | 讀／寫 | 多物件列印 |
| GLB | 寫 | 讀（有限） | 視覺化、動畫 |
| xbf | 讀寫 | 不支援 | cadgen 私有快取／分享 |
| FCStd | 不支援 | 讀寫 | FreeCAD 工作檔（參數、TechDraw、FEM） |

## 過橋相關疑難

| 症狀 | 處理 |
| --- | --- |
| `cadgen snapshot` 回 `OCCT could not hand its picture over` | 本機離屏截圖不可用；改用 FreeCAD `get_view`／`view.saveImage` |
| `read_step` 很慢（大 STEP） | 先轉一次 xbf（`$cad` 的 exports 章節），之後用 `read_xbf` |
| STEP 匯入後體積不符 | 先確認單位與縮放；再確認是不是只匯入了部分實體 |
| cadgen 指令版本不對 | 見 `$cad` 的 `+0.8.1` 與 PATH 說明（完整路徑 `~\.local\bin\cadgen.cmd`） |
