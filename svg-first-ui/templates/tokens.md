# 設計變數（Design Tokens）— <專案／產品名稱>

> 這份檔案是全專案唯一的樣式來源。SVG 草稿與各平台程式碼都只引用這裡的 token。
> 狀態：草案 v0.1 ｜ 待確認 ｜ 確認後補上核准日期與核准人。
> 用法：複製到 `design/tokens.md` → 填值 → 給使用者確認 → Phase 2 中保真起只准用表內的值。

## 0. 使用規則

1. 新增樣式前先在這裡加 token；表裡沒有的值不准出現在 SVG 或程式碼。
2. token 名稱只描述「用途」（`--color-danger`），不描述「長相」（`--color-red-500`）。
3. 改值只改這裡；改完檢查所有畫面，並在變更紀錄補一列。
4. 狀態不能只靠顏色分辨，一律搭配文字或圖示（色盲與強光環境都要讀得出來）。
5. 文字對比：正文與背景 ≥ 4.5:1，大字 ≥ 3:1。

## 1. 色彩

| Token | 值 | 用途 |
|---|---|---|
| `--color-bg` | `#0B1220` | 畫面底色 |
| `--color-surface` | `#111A2B` | 卡片、面板 |
| `--color-surface-raised` | `#18233A` | 浮起層：選取、hover、下拉 |
| `--color-surface-sunken` | `#080D16` | 凹槽、輸入框內底 |
| `--color-overlay` | `rgba(3, 7, 14, 0.64)` | modal／drawer 遮罩 |
| `--color-border` | `#25324A` | 一般邊框、分隔線 |
| `--color-border-strong` | `#3B4C6B` | 強調邊框、聚焦前狀態 |
| `--color-text-primary` | `#E6EDF7` | 主要文字 |
| `--color-text-secondary` | `#9FB0C7` | 次要文字、標籤 |
| `--color-text-muted` | `#64748B` | 說明、佔位、停用文字 |
| `--color-text-on-primary` | `#FFFFFF` | 主色底上的文字 |
| `--color-primary` | `#2F80ED` | 主要動作、選取 |
| `--color-primary-hover` | `#4A94F2` | 主色 hover |
| `--color-primary-pressed` | `#1F66C4` | 主色 pressed |
| `--color-success` | `#22C55E` | 成功、運轉中 |
| `--color-warning` | `#F59E0B` | 警告、待處理 |
| `--color-danger` | `#EF4444` | 錯誤、警報 |
| `--color-info` | `#38BDF8` | 提示、資訊 |
| `--color-offline` | `#6B7280` | 離線、未知 |
| `--color-disabled-bg` | `#1A2436` | 停用背景 |
| `--color-disabled-text` | `#4B5B73` | 停用文字 |
| `--color-focus-ring` | `#7CB4FF` | 鍵盤聚焦外框 |
| `--color-chart-1` | `#2F80ED` | 圖表序列 1 |
| `--color-chart-2` | `#22C55E` | 圖表序列 2 |
| `--color-chart-3` | `#F59E0B` | 圖表序列 3 |
| `--color-chart-4` | `#A78BFA` | 圖表序列 4 |

主題策略（二選一，決定後寫進 UI_SPEC）：

- 單一深色主題：直接採用上表。
- 深／淺雙主題：另存 `tokens.light.md`，token 名稱完全相同，只換值；程式用主題切換。

## 2. 字體

| Token | 值 | 用途 |
|---|---|---|
| `--font-family-ui` | `"Microsoft JhengHei UI", "Segoe UI", "Noto Sans TC", system-ui, sans-serif` | 介面文字 |
| `--font-family-mono` | `"Cascadia Mono", Consolas, "SF Mono", monospace` | 數值、機台編號、時間 |
| `--font-size-xs` | `12px` | 輔助說明、表格註記 |
| `--font-size-sm` | `14px` | 表格內容、次要按鈕 |
| `--font-size-md` | `16px` | 正文、輸入框 |
| `--font-size-lg` | `18px` | 卡片標題、區塊標題 |
| `--font-size-xl` | `20px` | 頁面標題 |
| `--font-size-2xl` | `24px` | 大標題 |
| `--font-size-3xl` | `32px` | KPI 數值 |
| `--font-size-display` | `48px` | 主視覺數值 |
| `--font-weight-regular` | `400` | 正文 |
| `--font-weight-medium` | `500` | 標籤、按鈕 |
| `--font-weight-semibold` | `600` | 標題、表頭 |
| `--font-weight-bold` | `700` | KPI、強調 |
| `--line-height-tight` | `1.2` | 大標題、數值 |
| `--line-height-normal` | `1.45` | 正文 |
| `--line-height-loose` | `1.6` | 長文說明 |

- 數值用 `--font-family-mono`，並在平台開啟等寬數字（WPF `Typography.NumeralAlignment="Tabular"`、CSS `font-variant-numeric: tabular-nums`）。
- 觀看距離 >1m 的畫面（控制室、看板），正文最小 16px。

## 3. 間距（8px 基準）

| Token | 值 | 典型用途 |
|---|---|---|
| `--space-0` | `0` | 無間距 |
| `--space-1` | `4px` | 元件內部光學微調 |
| `--space-2` | `8px` | 圖示與文字、行內間距 |
| `--space-3` | `12px` | 卡片內小區塊間距 |
| `--space-4` | `16px` | 卡片 padding、控制項間距 |
| `--space-5` | `24px` | 卡片之間、區塊內 padding |
| `--space-6` | `32px` | 區塊之間、頁面 padding |
| `--space-7` | `40px` | 大區塊間距 |
| `--space-8` | `48px` | 頁首頁尾留白 |
| `--space-9` | `64px` | 大留白 |
| `--space-10` | `80px` | 主視覺留白 |

規則：版面間距只用 8 的倍數；只有元件內部微調可用 4。

## 4. 圓角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-none` | `0` | 表格、滿版區塊 |
| `--radius-sm` | `4px` | 輸入框、小按鈕 |
| `--radius-md` | `8px` | 卡片、按鈕 |
| `--radius-lg` | `12px` | 面板、drawer |
| `--radius-xl` | `16px` | 大卡片、modal |
| `--radius-pill` | `999px` | 標籤、狀態膠囊 |

## 5. 邊框與陰影

| Token | 值 | 用途 |
|---|---|---|
| `--border-width` | `1px` | 一般邊框、分隔線 |
| `--border-width-strong` | `2px` | 選取、警報、聚焦 |
| `--shadow-1` | `0 1px 2px rgba(0,0,0,0.24)` | 卡片浮起 |
| `--shadow-2` | `0 8px 24px rgba(0,0,0,0.32)` | 下拉、popover |
| `--shadow-3` | `0 24px 48px rgba(0,0,0,0.48)` | modal、drawer |

深色主題優先用邊框與亮度層次區分層級，陰影只給浮層。

## 6. 圖示與控制項尺寸

| Token | 值 | 用途 |
|---|---|---|
| `--icon-xs` | `16px` | 行內圖示、狀態點旁 |
| `--icon-sm` | `20px` | 按鈕內圖示、導覽 |
| `--icon-md` | `24px` | 工具列圖示 |
| `--icon-lg` | `32px` | 卡片主圖示 |
| `--control-height-sm` | `32px` | 桌面緊湊工具列 |
| `--control-height-md` | `40px` | 一般輸入框、按鈕 |
| `--control-height-lg` | `48px` | 觸控、現場機台 |
| `--tap-target-min` | `44px` | 可點區域下限（觸控） |
| `--table-row-height` | `56px` | 資料列高度 |

## 7. 動效

| Token | 值 | 用途 |
|---|---|---|
| `--duration-fast` | `120ms` | hover、focus |
| `--duration-normal` | `200ms` | 展開、切換 |
| `--duration-slow` | `320ms` | drawer、modal |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 預設曲線 |

尊重系統的「減少動畫」設定；資料刷新動畫不超過 200ms，避免干擾判讀。

## 8. 版面

| Token | 值 | 用途 |
|---|---|---|
| `--layout-design-width` | `1920px` | 設計基準寬（依目標裝置改） |
| `--layout-min-width` | `1280px` | 最小支援寬 |
| `--layout-content-max` | `1600px` | 內容最大寬（Web） |
| `--layout-page-padding` | `32px` | 頁面左右留白 |
| `--layout-grid-gutter` | `24px` | 欄位間距 |
| `--layout-sidebar-width` | `256px` | 側邊導覽寬 |
| `--breakpoint-sm` | `640px` | Web 斷點（小手機） |
| `--breakpoint-md` | `1024px` | Web 斷點（平板） |
| `--breakpoint-lg` | `1440px` | Web 斷點（桌機） |

## 9. 平台對應

候選平台未定時，兩張表都要填；`UI_SPEC.md` 只會用選定平台那一張。

### WPF／Avalonia／Web／Flutter

| Token | SVG 用法 | WPF | Avalonia | Web | Flutter |
|---|---|---|---|---|---|
| `--color-primary` | `fill`／`stroke` | `PrimaryBrush`（`SolidColorBrush`） | `PrimaryBrush`（`DynamicResource`） | `var(--color-primary)` | `Theme.of(context).colorScheme.primary` |
| `--font-size-md` | `font-size` | `sys:Double`＋`FontSize` | `x:Double`＋`FontSize` | `font-size: var(--font-size-md)` | `textTheme.bodyMedium` |
| `--space-4` | x／y／width | `Thickness` 資源＋`Margin` | `Thickness` 資源＋`Padding` | `padding: var(--space-4)` | `EdgeInsets.all(16)` |
| `--radius-md` | `rx` | `CornerRadius` 資源 | `CornerRadius` 資源 | `border-radius: var(--radius-md)` | `BorderRadius.circular(8)` |
| `--duration-normal` | — | `Duration` 資源 | `TimeSpan` 資源 | `transition-duration` | `Duration(milliseconds: 200)` |

### Qt／QML 與 Slint

| Token | SVG 用法 | Qt/QML | Slint |
|---|---|---|---|
| `--color-primary` | `fill`／`stroke` | `Tokens.primary`（`pragma Singleton` + `qmldir`） | `Theme.primary`（`export global`） |
| `--font-size-md` | `font-size` | `font.pixelSize: Tokens.fontSizeMd` | `font-size: Theme.font-size-md` |
| `--space-4` | x／y／width | `Layout.margins`／`spacing: Tokens.space4` | layout 的 `padding`／`spacing: Theme.space-4` |
| `--radius-md` | `rx` | `Rectangle { radius: Tokens.radiusMd }` | `border-radius: Theme.radius-md` |
| `--duration-normal` | — | `NumberAnimation { duration: Tokens.durationNormal }` | `animate { duration: 200ms }` |

其他平台照同樣方式補一列。

## 10. 變更紀錄

| 版本 | 日期 | 改了什麼 | 核准 |
|---|---|---|---|
| v0.1 | <YYYY-MM-DD> | 初版草案 | 待確認 |
