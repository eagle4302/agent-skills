# Qt／QML 轉換要點

> 前提：`UI_SPEC.md` 已存在、高保真已核准。這份只講「怎麼把核准的 SVG 變成乾淨的 QML 版面」。
> 適用 Qt 6（Qt 6 起 QML import 不寫版本號）；Qt 5 專案請自行保留版本號。

## 1. 尺寸與 DPI

- SVG 的 1 設計 px 對應 QML 的 1 邏輯像素；Qt 6 預設啟用高 DPI 縮放，由 `Screen.devicePixelRatio` 自動處理。
- 視窗尺寸直接對應 `viewBox`：`width: 1920; height: 1080`。
- 截圖比對固定 `QT_SCALE_FACTOR=1`、同視窗尺寸、關閉動畫；不要用 150% 縮放的螢幕截圖當基準。
- 觸控目標 44–48 邏輯 px 寫成 token，不因 DPI 改變。

## 2. 版面

| SVG 結構 | QML 寫法 |
|---|---|
| 固定頂部工具列 | `ColumnLayout`：表頭 `Layout.preferredHeight`、內容 `Layout.fillHeight: true` |
| 左右分欄 | `RowLayout`：左欄 `Layout.preferredWidth: 360; Layout.fillHeight: true`，右欄 `Layout.fillWidth: true` |
| KPI 四欄等寬 | `RowLayout` + 每個 `Layout.fillWidth: true`，或 `GridLayout { columns: 4 }` |
| 卡片內堆疊 | `ColumnLayout` + `spacing`，內距用 `Layout.margins` |
| 清單 | `ListView` + delegate（資料驅動，不手動複製 row） |
| 表格 | Qt Quick Controls 的 `TableView`（依 Qt 版本確認）或 `ListView` + 自訂列 |
| 浮層 | `Popup`／`Drawer`／`Overlay`；不要用 `x`/`y` 拼版面 |

規則：

- 在 `Layout` 裡只用 `Layout.*` 調整尺寸（`Layout.fillWidth`、`Layout.preferredWidth`…）；直接寫 `width`／`height` 會被 layout 忽略。
- 同一個 item 不要同時用 `anchors` 和 `Layout.*`。
- 靜態等寬排列用 `Row`／`Column`，需要隨視窗伸縮才用 `RowLayout`／`ColumnLayout`。
- `Row`／`Column` 的 `spacing` 就是 token 的間距；`ColumnLayout` 的 `Layout.margins` 用 8 的倍數。
- 條件顯示用 `Loader`（`active: false` 時釋放），不要在畫面裡疊一堆 `visible: false` 的大區塊。
- 長字用 `Text { elide: Text.ElideRight }`，設計稿要先畫出被截斷的樣子。

## 3. 設計變數 → QML

用 singleton 當唯一 token 來源（`pragma Singleton` 與 `qmldir` 兩者都要）：

```qml
// Tokens.qml
pragma Singleton
import QtQuick

QtObject {
    readonly property color bg: "#0B1220"
    readonly property color surface: "#111A2B"
    readonly property color textPrimary: "#E6EDF7"
    readonly property color primary: "#2F80ED"
    readonly property int space4: 16
    readonly property int radiusMd: 8
    readonly property int fontSizeMd: 16
    readonly property int durationNormal: 200
}
```

```qml
// qmldir
module App.Tokens
singleton Tokens 1.0 Tokens.qml
```

- 元件只用 `Tokens.*`，不寫 hex。
- 內建 Qt Quick Controls 有自己的樣式主題；把 token 對應到樣式設定，或在需要時覆寫 `background`／`contentItem`。
- 一旦在檔案裡 `import QtQuick.Controls.Basic`（或 Material／Universal）就是編譯期固定樣式，該檔不能再被 `QT_QUICK_CONTROLS_STYLE` 切換；只在真的客製控制項的檔案加這個 import。
- 深淺主題：切換 token singleton 的 `Theme.dark` 或 Qt 的 `ColorScheme`，不要逐個元件改色。

## 4. 元件與重用

| SVG | QML |
|---|---|
| `<g id="header">` | `Header.qml`（PascalCase 檔名） |
| `<use href="#icon-search">` | `IconSearch.qml`，或 `Image { source: "icons/search.svg" }` |
| 重複卡片 | `KpiCard.qml` + `Repeater`／`ListView` |
| 清單列 | `ListView` + delegate，delegate 用 `required property` 接 model role |
| 條件面板 | `Loader` + 獨立 `*Panel.qml` |

- 檔案按責任拆：`main.qml` 只做視窗與頂層導覽，不放大段版面或 delegate。
- 拆檔門檻：單檔約 150–200 行、或嵌套超過 3 層，就抽元件。
- 元件名稱＝`g id` 轉 PascalCase（`btn-confirm-alarm` → `ConfirmAlarmButton.qml`）。

## 5. 狀態

- 狀態用 enum 字串屬性（`"loading" | "ready" | "empty" | "error" | "alarm" | "offline" | "no-permission"`），不要一串 bool。
- 用 `states` + `PropertyChanges` 切換外觀；Qt 6 的 `PropertyChanges` 不寫 `target:`，直接 `PropertyChanges { someId.width: 100 }`。
- 面板級切換用 `Loader`：`sourceComponent` 依狀態選，切換時版面尺寸不變。
- 載入中：骨架 `Rectangle` 撐住原尺寸。
- 空／錯誤／離線／無權限：同一個 slot 換內容元件，不要各做一份頁面。
- 停用：`enabled: false` 搭配停用 token，並保留 `Accessible.name` 說明原因。

## 6. 資料與假資料

- 資料用 `ListModel`／`QAbstractItemModel`；delegate 用 `required property` 接欄位，角色一律寫 `model.roleName`。
- 假資料放 `fixtures/`，設計預覽與截圖共用同一份。
- 開發期切狀態：啟動參數 `--state=error`、dev 選單，或 `Loader` 的 `active` 開關；每個狀態都要能直接開。
- 使用者可見字串全部包 `qsTr()`；數字用 `%1` 佔位，不要字串串接。日期時間用 `Qt.formatDateTime` 對齊設計稿格式。

## 7. 字型與圖示

- `font.family` 用 token 的 `Microsoft JhengHei UI`，`font.pixelSize` 用 token 字級；Qt 6 不要用 `pointSize`，避免 DPI 不一致。
- 數值用等寬字（`font.family: "Cascadia Mono"`），避免每秒更新時寬度跳動。
- 圖示用核准 SVG 的原檔（`Image` + `sourceSize`）或轉成 `Path`；不要換成線寬不同的 icon set。
- 中文字型 fallback 依平台不同，行高可能差 1–2px，屬容許範圍。

## 8. 截圖與比對

- 在 app 內加 `--screenshot <state> <out.png>`：`QQuickWindow::grabWindow()` 取窗面（渲染完成後再取），或 QML 端 `grabToImage()`。
- 固定視窗 1920×1080、`QT_SCALE_FACTOR=1`、關閉動畫、固定假資料；每個狀態各一張。
- 無頭 CI 可試 `QT_QPA_PLATFORM=offscreen` 搭配軟體 renderer；若畫面空白，改用有顯示環境的機器截圖。
- 與核准 PNG 同尺寸並排，輸出 `design/<screen>/compare/<state>_compare.png`，差異用腳本算。

## 9. 常見坑

- Layout 內直接寫 `width`／`height` 會被忽略：要用 `Layout.*`。
- `anchors` 與 `Layout.*` 混用會衝突，同一 item 只能選一種。
- 在 `ListView` delegate 裡，`parent` 不是 ListView；用 `ListView.view` 或具名 id。
- 匯入具體 style（Basic／Material）會固定該檔樣式，讓 runtime 切換主題失效。
- 屬性名稱不能是 `on` + 大寫開頭（`onPrimary`、`onAccent`），載入時會跟 signal handler 語法衝突；改用 `textOnPrimary`。
- `opacity`／`clip` 套在大子樹上很貴：用葉節點顏色 alpha、或減少層級。
- 隱藏元素不要用 `visible: false` 的重量級子樹；用 `Loader.active` 徹底卸載。
- 中文行高、字距與瀏覽器不同：以 token 的行高與字級為準，不要逐像素追。
- 捲軸寬度、控制項內距與設計稿不同：用樣式覆寫，不在 view 裡硬塞 `x` 位移。
