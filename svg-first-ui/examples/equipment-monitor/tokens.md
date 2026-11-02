# 設計變數（Design Tokens）— 設備運轉監控（示範草案）

> 這份是 Phase 2 低保真時「先提出、等確認」的草案。狀態：**草案 v0.1；使用者 2025-11-01 回覆「照預設」，視為確認**（色票可在中保真回饋時調整）。
> 目標平台：**未定**（候選：XAML／WPF、Avalonia、Qt／QML、Slint）；控制室 24 吋觸控螢幕、1920×1080、觀看距離約 1.5m。
> 低保真只用灰階；這份色票要在進中保真前確認。

## 1. 色彩

| Token | 值 | 用途 |
|---|---|---|
| `--color-bg` | `#0B1220` | 畫面底色 |
| `--color-surface` | `#111A2B` | 面板、卡片 |
| `--color-surface-raised` | `#18233A` | 選取列、hover、浮層 |
| `--color-border` | `#25324A` | 邊框、分隔線 |
| `--color-border-strong` | `#3B4C6B` | 選取邊框、警報外框 |
| `--color-text-primary` | `#E6EDF7` | 主要文字 |
| `--color-text-secondary` | `#9FB0C7` | 標籤、次要資訊 |
| `--color-text-muted` | `#64748B` | 說明、停用、缺值 |
| `--color-primary` | `#2F80ED` | 主要動作、目前選取 |
| `--color-success` | `#22C55E` | 運轉中 |
| `--color-info` | `#38BDF8` | 待機中 |
| `--color-warning` | `#F59E0B` | 警告、保養提醒 |
| `--color-danger` | `#EF4444` | 警報、嚴重異常 |
| `--color-offline` | `#6B7280` | 離線、未知 |
| `--color-chart-1` | `#2F80ED` | 趨勢圖主線 |
| `--color-chart-2` | `#F59E0B` | 閾值線 |

狀態色一定要搭配文字或圖示（例：「● 運轉」「▲ 警報」），不能只靠顏色。

## 2. 字體

| Token | 值 | 用途 |
|---|---|---|
| `--font-family-ui` | `"Microsoft JhengHei UI", "Segoe UI", "Noto Sans TC", sans-serif` | 介面文字 |
| `--font-family-mono` | `"Cascadia Mono", Consolas, monospace` | 機台編號、數值、時間 |
| `--font-size-xs` | `12px` | 表頭註記、時間 |
| `--font-size-sm` | `14px` | 次要文字、清單副標 |
| `--font-size-md` | `16px` | 正文（1.5m 觀看距離的下限） |
| `--font-size-lg` | `20px` | 卡片標題 |
| `--font-size-xl` | `24px` | 頁面標題、設備名稱 |
| `--font-size-3xl` | `32px` | KPI、量測值 |
| `--font-size-display` | `48px` | 卡片上的 OEE 主數值 |
| `--line-height-tight` | `1.2` | 大數值 |
| `--line-height-normal` | `1.45` | 正文 |

數值一律用等寬字並開啟等寬數字，避免跳動。

## 3. 間距（8px 基準）

`--space-1` 4、`--space-2` 8、`--space-3` 12、`--space-4` 16、`--space-5` 24、`--space-6` 32、`--space-7` 40、`--space-8` 48、`--space-9` 64、`--space-10` 80（單位 px）。

版面只用 8 的倍數；元件內部微調用 4。

## 4. 圓角與邊框

`--radius-sm` 4（輸入框、小按鈕）、`--radius-md` 8（卡片、按鈕）、`--radius-lg` 12（面板、抽屜）、`--radius-pill` 999（狀態標籤）。
`--border-width` 1；`--border-width-strong` 2（選取、警報）。

## 5. 圖示與控制項

`--icon-sm` 16、`--icon-md` 20、`--icon-lg` 24、`--icon-xl` 32。
`--control-height-md` 40（桌面）、`--control-height-lg` 48（觸控）、`--tap-target-min` 48（控制室戴手套操作）。
`--table-row-height` 48（警報表）、`--list-row-height` 64（設備清單）。

## 6. 版面

| Token | 值 | 用途 |
|---|---|---|
| `--layout-design-width` | `1920px` | 設計基準 |
| `--layout-min-width` | `1280px` | 最小支援寬（低於此出現橫向捲軸） |
| `--layout-page-padding` | `32px` | 頁面留白 |
| `--layout-gutter` | `24px` | 面板與卡片間距 |
| `--layout-sidebar-width` | `360px` | 左側設備清單 |
| `--layout-drawer-width` | `480px` | 方案 B 的詳情抽屜 |

## 7. 平台對應（Phase 4 依選定平台套用）

候選平台未定，先列四個候選的對應方式；Phase 4 只會用其中一欄。

| Token | WPF | Avalonia | Qt/QML | Slint |
|---|---|---|---|---|
| `--color-bg` / `--color-surface` | `BgBrush`／`SurfaceBrush` | `DynamicResource BgBrush`／`SurfaceBrush` | `Tokens.bg`／`Tokens.surface` | `Theme.bg`／`Theme.surface` |
| `--font-size-md` | `FontSizeMd`（`sys:Double`） | `FontSizeMd`（`x:Double`） | `font.pixelSize: Tokens.fontSizeMd` | `font-size: Theme.font-size-md` |
| `--space-4` | `Space4`（`Thickness`） | `Space4`（`Thickness`） | `spacing: Tokens.space4` | `spacing: Theme.space-4` |
| `--radius-md` | `RadiusMd`（`CornerRadius`） | `RadiusMd`（`CornerRadius`） | `radius: Tokens.radiusMd` | `border-radius: Theme.radius-md` |
| `--control-height-lg` | `ControlHeightLg`（`sys:Double`） | `ControlHeightLg`（`x:Double`） | `implicitHeight: Tokens.controlHeightLg` | `height: Theme.control-height-lg` |
| `--table-row-height` | `TableRowHeight`（`sys:Double`） | `TableRowHeight`（`x:Double`） | delegate 高度用 `Tokens.tableRowHeight` | `height: Theme.table-row-height` |

## 8. 變更紀錄

| 版本 | 日期 | 改了什麼 | 核准 |
|---|---|---|---|
| v0.1 | 2025-11-01 | 初版草案（依附圖兩個低保真方案） | 使用者確認（照預設） |
