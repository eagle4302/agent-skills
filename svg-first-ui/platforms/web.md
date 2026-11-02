# Web（HTML／CSS／React／Vue）轉換要點

> 前提：`UI_SPEC.md` 已存在、高保真已核准。這份只講「怎麼把核准的 SVG 變成乾淨的 Web 版面」。
> React／Vue 只差元件語法，版面與 token 規則相同。

## 1. 尺寸換算

- 設計 px 對應 CSS px（DPR 1 時 1:1）；瀏覽器縮放與 DPR 由 CSS 自動處理。
- 字級建議用 `rem`（根字級 16px）：`14px → 0.875rem`；間距可直接用 px 或 `--space-*` 變數。
- 截圖比對固定 viewport（例 1920×1080）與 `deviceScaleFactor: 1`。
- 設計 1920 不代表固定 1920：內容區用 `max-width` 與 grid，視窗縮小時重排而不是出現橫向捲軸。

## 2. 版面

| SVG 結構 | CSS 寫法 |
|---|---|
| 固定頂部工具列 | `display: flex; align-items: center;` + `position: sticky; top: 0` |
| 左右分欄 | `display: grid; grid-template-columns: 360px minmax(0, 1fr);` |
| KPI 四欄等寬 | `display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-5);` |
| 卡片內堆疊 | `display: flex; flex-direction: column; gap:` |
| 表格 | 語意 `<table>` 或 `display: grid`；表頭 `position: sticky` |
| 浮層 | `position: fixed` + `inset: 0` 遮罩 + `z-index` token；drawer 用 `transform: translateX()` |
| 絕對定位 | 只用於浮層、徽章、圖表標註；版面排列一律用 flex／grid |

- `gap` 取代子元素的 margin，值是 `--space-*`。
- `min-width: 0` 給 grid／flex 子項，避免長字撐破版面。
- 觸控目標 ≥ 44×44：`min-height`、`min-width` 或加大 padding。

## 3. 設計變數 → CSS custom properties

```css
:root {
  --color-bg: #0B1220;
  --color-surface: #111A2B;
  --color-text-primary: #E6EDF7;
  --color-primary: #2F80ED;
  --space-4: 16px;
  --radius-md: 8px;
  --font-size-md: 16px;
  --duration-normal: 200ms;
}

[data-theme="light"] {
  --color-bg: #F6F8FA;
  --color-surface: #FFFFFF;
  --color-text-primary: #111827;
}
```

- token 名稱照 `design/tokens.md`，不要另創縮寫。
- 元件只用 `var(--*)`，不寫 hex；唯一例外是 `<svg>` 圖示內的 path（沿用核准 SVG 的值）。
- 深淺主題用 `[data-theme]` 或 `@media (prefers-color-scheme)`；主題切換只換 token，不改元件。

## 4. 元件與重用

| SVG | Web |
|---|---|
| `<g id="header">` | 元件 `<Header />`／`<header class="topbar">` |
| `<use href="#icon-search">` | SVG sprite：`<svg><use href="/icons.svg#icon-search"/></svg>`；或 `IconSearch` 元件 |
| 重複卡片 | `cards.map(c => <KpiCard key={c.id} {...c} />)`；Vue 用 `v-for` |
| 清單列 | 資料驅動渲染，**不要手動貼 N 份 HTML** |
| `<symbol>` | `viewBox` 保留，`currentColor` 讓顏色繼承文字色 |

- 元件名稱＝`g id` 轉 PascalCase：`btn-confirm-alarm` → `ConfirmAlarmButton`。
- 樣式放同一層（CSS Module／scoped style／Tailwind 的 token class），不要把尺寸散在 inline style。
- 用 `:focus-visible` 畫 `--color-focus-ring`，不要 `outline: none`。

## 5. 狀態

- 容器掛 `data-state="loading|ready|empty|error|alarm|offline|no-permission|disabled"`，CSS 用屬性選擇器切換。
- 載入中：骨架 `aria-busy="true"`，尺寸與內容一致，避免 CLS。
- 空／錯誤／無權限：同一個 slot 換內容元件，版面骨架不動。
- 離線：`navigator.onLine` + API 失敗偵測；顯示最後更新時間與重試。
- 停用：`aria-disabled="true"` + 停用樣式，按鈕仍可聚焦說明原因。
- 狀態文字帶顏色＋文字／圖示，不只靠顏色。

## 6. 資料與假資料

- fixture 一份共用：設計預覽、單元測試、截圖都用它。
- dev 切狀態：`?state=error` 查詢參數或 Storybook／Ladle 的 story；每個狀態都要能直接開。
- 數字格式用 `Intl.NumberFormat`、時間用 `Intl.DateTimeFormat`，與設計稿的格式對齊（千分位、單位、時區）。
- 長文字用 `overflow: hidden; text-overflow: ellipsis` 或 `line-clamp`，但設計稿要先畫出被截斷的樣子。

## 7. 字型與圖示

- 字型用 token 的 stack；需要自訂字型時用 `@font-face` + `font-display: swap`，並確認核准稿就是用該字型畫的。
- 數值開 `font-variant-numeric: tabular-nums`。
- 圖示沿用核准 SVG 的 `<path>`，用 `stroke="currentColor"`；不要換成線寬不同的 icon set。
- 檢查 200% 文字縮放不破版（`rem` 與 `min-height` 會有幫助）。

## 8. 截圖與比對

- Playwright 腳本：固定 viewport、DPR 1、`page.emulateMedia({ reducedMotion: 'reduce' })`、等 `document.fonts.ready` 再截。
- 每個狀態截一張：`design/<screen>/compare/<state>_impl.png`。
- 與核准 PNG 同尺寸並排；用 pixelmatch／PIL 算差異百分比與熱區。
- 動畫與 hover 不列入靜態比對，但 hover／focus 要另外截圖確認。

```ts
// 範例：Playwright 截圖
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`${base}/orders?state=normal`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'design/orders/compare/normal_impl.png', animations: 'disabled' });
```

## 9. 常見坑

- 瀏覽器預設樣式（`body` margin、`button` 字型、`table` 邊框）會讓版面差幾 px：先做 reset／base layer。
- 捲軸寬度（約 15–17px）會影響右側對齊：用 `scrollbar-gutter: stable` 或 overlay 捲軸。
- `line-height` 與字型 fallback 造成文字垂直位置不同：行高用 token，不用預設 `normal`。
- `100vh` 在行動瀏覽器會跳：用 `100dvh`。
- 圖片／圖示沒給寬高會造成 CLS；`aspect-ratio` 或固定尺寸。
- 深色主題的陰影幾乎看不見：用邊框與 `--color-surface-raised`。
- 表格 `border-collapse` 與 1px 線在不同縮放會消失：用 `box-shadow: inset` 或 2px 底線。
