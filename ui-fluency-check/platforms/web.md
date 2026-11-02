# Web／瀏覽器量測要點

> 分兩種情況：
> 1. 目標平台就是 Web：這裡的數字就是產品數字，照量。
> 2. 目標是原生平台，瀏覽器只拿來驗動線：**不要**用這裡的延遲、動畫、focus 去判斷原生手感。

## 1. 流程原型（目標不是 Web 時）

- 用 `assets/flow-prototype.html`，直接把核准的 SVG／PNG 放進去，只用熱點切換畫面。
- 不要用 CSS 重排版面；那會產生第二份設計來源與第二套版面 bug。
- 熱點位置用設計尺寸的百分比，這樣換解析度也不會歪。
- 每個會走到的狀態都要有圖；缺圖就是 finding。
- 點擊紀錄用 `C` 複製或「下載 JSON」，貼進 `log.md`。
- 原型檔標明 `prototype`，不進正式碼、不進 production。

## 2. 輸入到回饋延遲（目標是 Web 時）

```js
const t0 = performance.now();
button.addEventListener('pointerdown', () => {
  // 變更畫面、顯示 loading
  requestAnimationFrame(() => {
    // 第一個可見回饋已排入下一個畫面
    requestAnimationFrame(() => {
      log(performance.now() - t0);
    });
  });
}, { once: true });
```

- 量 ≥ 30 次，報 median 與 p95。
- 用 `pointerdown` 而不是 `click`，才對得上「按下就有回饋」。
- 若用框架，注意 state 更新 + render + paint 三個階段都要算進去。

## 3. 幀時間與長任務

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) longTasks.push(entry.duration);
  }
}).observe({ type: 'longtask', buffered: true });

let last = 0;
function tick(now) {
  if (last) frameDeltas.push(now - last);
  last = now;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

- 報 p50、p95、max 與 long task 次數。
- 背景分頁會節流 rAF：量測頁面必須在前景，且不要開 DevTools。
- 用 `PerformanceObserver` 抓 `longtask`，用 `performance.memory` 只能粗略參考。

## 4. 焦點與鍵盤

- Tab 走一輪，記錄 `document.activeElement` 的 `tagName`、`id`、`aria-label`。
- 焦點外框必須可見；檢查 `:focus-visible` 沒有被 `outline: none` 吃掉。
- 所有動作可用鍵盤完成；Esc、Enter、空白鍵行為一致。
- 自訂元件要驗 `role`、`aria-*`、`tabindex`。

## 5. 觸控與可及性

- 觸控目標 ≥ 44×44 CSS px；用 `getBoundingClientRect()` 掃描可點元素。
- 對比：正文 ≥ 4.5:1，大字 ≥ 3:1；用 token 值驗。
- 狀態不只靠顏色；檢查高對比／減少動畫（`prefers-reduced-motion`）模式。

## 6. 資料壓力（目標是 Web 時）

- 每秒更新 24–100 筆：量 long task、幀時間、輸入延遲。
- 1000 列：確認列表虛擬化；用 `requestIdleCallback` 或分批更新。
- 快速連點：確認只送出一次請求（按鈕 loading、`AbortController`）。
- 離線／恢復：`navigator.onLine` + 重試策略。

## 7. 截圖

```js
// Playwright
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, animations: 'disabled' });
```

- 固定 viewport、DPR 1、字型載入完成、動畫關閉。
- 每個狀態各一張；檔名對應 `test-plan.md` 的狀態清單。
- 與核准 PNG 同尺寸並排。

## 8. 常見坑

- DevTools 開著量測：延遲與幀時間全部偏高。
- 瀏覽器縮放不是 100%：尺寸與截圖全部不對。
- 背景分頁：rAF 被節流，幀時間看起來很好但沒有意義。
- 字型還沒載入就截圖：文字位移或變字型。
- 捲軸寬度造成右側對齊差 15–17px：用 `scrollbar-gutter: stable`。
- 用滑鼠事件代表觸控：邊緣命中與 hover 行為都不同。
- 拿瀏覽器數字宣稱「WPF 也會一樣快」：兩邊渲染與輸入管線不同，不能互推。
