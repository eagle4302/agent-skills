# Slint 轉換要點

> 前提：`UI_SPEC.md` 已存在、高保真已核准。這份只講「怎麼把核准的 SVG 變成乾淨的 Slint 版面」。
> 目標版本 Slint 1.17 以上；`slint-viewer --check` 與 `--screenshot` 為 1.17+，`--size` 為 1.18+。

## 1. 尺寸與 DPI

- Slint 的 `px` 是邏輯像素，會依系統縮放自動放大；`phx` 才是不隨縮放變的實體像素。版面一律用 `px`。
- 視窗尺寸直接對應 `viewBox`，根元件寫明尺寸：

```slint
export component EquipmentMonitor inherits Window {
    width: 1920px;
    height: 1080px;
}
```

- 截圖比對固定 `SLINT_SCALE_FACTOR=1`；`slint-viewer --size 1920x1080` 可強制輸出尺寸（1.18+）。

## 2. 版面

| SVG 結構 | Slint 寫法 |
|---|---|
| 固定頂部工具列 | `VerticalLayout`：表頭固定高度、內容 `vertical-stretch: 1` |
| 左右分欄 | `HorizontalLayout`：左欄 `min-width`／`max-width: 360px`，右欄 `horizontal-stretch: 1` |
| KPI 四欄等寬 | `HorizontalLayout` + 每個子項 `horizontal-stretch: 1`，或 `GridLayout` |
| 卡片內堆疊 | `VerticalLayout` + `spacing`；內距用 layout 的 `padding` |
| 清單 / 表格 | `ListView`（會虛擬化）＋列元件；長列表不要用 `for` + `ScrollView` |
| 浮層 | 根層用 `if` 疊一層 `Rectangle`（遮罩）＋面板，或依版本用 `PopupWindow`／`Dialog` |
| 自由畫布（機台配置圖） | 只有這種才用 `x`／`y` 定位 |

規則：

- `padding`／`spacing` 只對 layout 元素有效；要讓 `Text` 有內距，包一層 layout 再設 `padding-left`。
- 容器與圖形元素（`Rectangle`、`TouchArea`、layout）預設填滿父層；`Text`／`Image` 預設取自身偏好尺寸。要撐滿就 `width: 100%; height: 100%` 或放進 layout。
- 不在 layout 裡、又沒設 `x`／`y` 的元素會置中；要貼左上就明確 `x: 0; y: 0;`。
- 分配剩餘空間用 `horizontal-stretch`／`vertical-stretch` 搭配 `min-width`／`preferred-width`／`max-width`。
- 需要換行的卡片流才用 `FlexboxLayout`（預設會換行）。
- Z 軸順序＝宣告順序，後宣告的在上；浮層最後宣告。

## 3. 設計變數 → Slint

Slint 沒有 CSS 變數；用 `export global` 當唯一 token 來源：

```slint
// tokens.slint
export global Theme {
    out property <color> bg: #0B1220;
    out property <color> surface: #111A2B;
    out property <color> text-primary: #E6EDF7;
    out property <color> primary: #2F80ED;
    out property <length> space-4: 16px;
    out property <length> radius-md: 8px;
    out property <length> font-size-md: 16px;
}
```

- 元件只用 `Theme.*`，不寫 hex。
- 深淺主題：用 `std-widgets.slint` 的 `Palette.color-scheme` 反映系統設定，再讓 `Theme` 依它切換值；範例見 Slint skill 的 `icons-and-theming.md`。
- 內建 widgets（`Button`、`LineEdit`…）搭配 `--style` 或 `Palette` 調整；不要為了改色自己刻一顆按鈕。

## 4. 元件與重用

| SVG | Slint |
|---|---|
| `<g id="header">` | `export component TopBar inherits Rectangle`（檔名 `top-bar.slint`） |
| `<use href="#icon-search">` | `Image { source: @image-url("icons/search.svg"); colorize: Theme.text-secondary; }` |
| 重複卡片 | `export component KpiCard` + `for` 或 `ListView` |
| 清單列 | `ListView` + 列元件；用 `for item[i] in model` 只在短列表 |
| 條件面板 | `if state == State.loading : LoadingPanel { }` |

- 元件名稱＝`g id` 轉 PascalCase；一個元件一個檔，用 `export component` 讓外面可以組。
- 需要轉發子元素時用 `@children`；共享狀態放 `export global`。
- 根元件用 `Window`（或 `Dialog`）；`main.slint` 只組裝頂層畫面。

## 5. 狀態

- 狀態用 enum 屬性（`enum State { loading, ready, empty, error, alarm, offline, no-permission }`），不要一串 bool。
- 切換用屬性綁定＋`if`，例如 `if root.state == State.error : ErrorPanel { }`；版面容器尺寸保持不變。
- 面板級切換各自抽成 `*Panel` 元件，`if` 只換內容，不動外框。
- 載入中：骨架 `Rectangle` 撐住原尺寸。
- 警報：外框加粗＋文字標籤，不要只換顏色（`Palette` 在深色／高對比模式可能不同）。
- 動效用 `animate` 加在需要變的屬性上（200ms）；不要用動畫讓清單每幀重排。

## 6. 資料與假資料

- 資料用 `in property <[Row]> rows` 或 model；行資料用 `export struct` 定義型別。
- 假資料放 `fixtures/*.json`，設計預覽與截圖共用。
- `slint-viewer --load-data props.json` 可把資料與 global 一起灌進預覽（例如 `{"Theme.dark": true}`）。
- 執行期互動驗證用 Slint 內建 MCP server（需 `slint/mcp` feature 與 `SLINT_MCP_PORT`）；設定見 Slint skill 的 `debugging-and-mcp.md`。
- 開發期切狀態：`--state=error` 參數或 dev 選單；每個狀態都要能直接開。

## 7. 字型與圖示

- 字級用 `font-size: Theme.font-size-md`；字型用 `font-family: "Microsoft JhengHei UI"`，數值用 `"Cascadia Mono"`。
- 圖示依 Slint 官方建議用 SVG 檔＋`Image`，不要手刻 `Path` 當 icon set；`colorize` 讓單色圖示跟著主題換色。
- 從核准草稿匯出圖示時，把 `<path>` 轉成獨立 `.svg` 檔，尺寸與 stroke 保持 1:1。
- 中文字型 fallback 依平台不同，行高差 1–2px 屬容許範圍。

## 8. 截圖與比對

```sh
slint-viewer --check ui/main.slint                      # 編譯檢查，不開窗
slint-viewer --screenshot out.png --size 1920x1080 ui/main.slint
slint-viewer --screenshot out.png --component KpiCard ui/widgets.slint
```

- `--screenshot` 用內建無頭軟體後端，不需要 X／Wayland／Xvfb（1.17+）；`--size` 在 1.18+。
- 每個狀態各截一張，固定 `SLINT_SCALE_FACTOR=1` 與同一份 fixture；和核准 PNG 同尺寸並排輸出 `design/<screen>/compare/`。
- 互動（點擊、hover、抽屜開關）用 MCP server 驗，或跑 app 後用 `Window::take_snapshot()` 存圖。
- 差異分類與容許值照 `SKILL.md` 的 Phase 5。

## 9. 常見坑

- 不在 layout 裡又沒 `x`／`y` 的元素會置中，不是貼左上。
- 元素在 layout 外可能寬高為 0：先確認它有沒有被 layout 或明確尺寸約束。
- `padding`／`spacing` 設在非 layout 元素上沒有效果。
- `for` + `ScrollView` 會一次實例化所有列；長清單改 `ListView`，否則 100 列以上會卡。
- 深色模式下 `Palette` 與自訂 token 可能不一致：內建 widget 與自繪元件都要吃同一份 `Theme`。
- 巢狀 `opacity`／`clip` 每層都增加 render pass：陰影與遮罩盡量平面化。
- 圖示放大會模糊：用 SVG，不要用點陣圖。
- 版面上的差距常來自中文字型 metrics 與內建 widget 內距：以 token 對齊，不逐像素追。
