# 原生平台量測要點（Avalonia／Qt QML／Slint）

> 目標平台不是 Web 時，用這頁。原則是同一個：固定環境、instrument 先做、每項 ≥ 30 次、報 median 與 p95。
> 不同平台、不同 build 的數字不能互相比較；只跟自己的門檻比。

## 共通流程

1. Release build，關閉 debugger／profiler 附著（除非就是要抓 trace）。
2. 固定視窗尺寸、縮放倍率 1、字型、動畫開關（量手感時開、截圖時關）。
3. 先預熱一次流程，排除前 3 次量測。
4. 每個互動量 ≥ 30 次；報 n、median、p95、max。
5. 同一輪不換 build、不換機器、不換輸入裝置。
6. 數據與截圖都放 `design/<screen>/fluency/evidence/`。

## Avalonia（11+）

- **輸入到回饋**：在事件處理器開頭記 `Stopwatch.GetTimestamp()`，用
  `Dispatcher.UIThread.Post(..., DispatcherPriority.Background)` 排在下一輪渲染後記錄耗時。
- **幀時間**：用 `TopLevel` 的渲染回呼或 `Dispatcher.UIThread.Post` 連續打點，統計間隔；
  也可用 Avalonia DevTools（F12）看 visual tree 與重繪範圍。
- **深挖**：`dotnet-trace`／ETW 取樣，看 GC、配置、UI 執行緒阻塞。
- **焦點順序**：用 `KeyboardNavigation`／`FocusManager` 走一輪，記錄 `Focusable` 元素的
  `Name`、`AutomationProperties.Name`、可見性。
- **觸控尺寸**：走 visual tree 檢查可互動元素 `Bounds` ≥ 44–48；實機觸控再驗邊緣命中。
- **截圖**：`RenderTargetBitmap` 以固定 `PixelSize` 與 DPI 渲染目標控制項後 `Save()`；
  無頭測試可用 `Avalonia.Headless`，但字型可能與實機不同，要再抽一張實機圖。
- **注意**：`RequestedThemeVariant` 與 token 要一致；`ControlTheme` 覆寫不影響量測，但會改變內距。

## Qt／QML（Qt 6）

- **輸入到回饋**：在 `onClicked`／`onPressed` 用 `QElapsedTimer` 記開始，於下一次畫面更新後停止；
  可用 `QQuickWindow::frameSwapped` 或 `QTimer::singleShot(0, ...)` 對齊下一個事件迴圈。
- **幀時間**：Qt Creator 的 QML Profiler（Frame Timing／Animations）最直接；
  也可以在 C++ 接 `QQuickWindow::frameSwapped` 記錄時間差。
- **渲染後端**：固定 `QSG_RENDER_LOOP` 與圖形後端（例：都跑 OpenGL 或都跑軟體）再比較，
  RHI 後端不同，數字不可比。
- **焦點與鍵盤**：`KeyNavigation`、`FocusScope` 走一輪；記錄 `activeFocusItem`。
- **截圖**：`QQuickWindow::grabWindow()` 或 QML `grabToImage()`；固定
  `QT_SCALE_FACTOR=1`、固定視窗尺寸。
- **注意**：`ListView` delegate 的 `Component.onCompleted` 成本會隨列數放大；量之前先確認虛擬化有開。
  動畫用 `NumberAnimation` 時，`duration` 與設定的差異要納入 ±20% 判定。

## Slint（1.17+）

- **編譯檢查**：`slint-viewer --check ui/main.slint`（1.17+），先排除編譯期問題。
- **靜態截圖**：`slint-viewer --screenshot out.png --size 1920x1080 ui/main.slint`（1.17+／`--size` 1.18+），
  無頭軟體後端、不需要 X／Wayland；固定 `SLINT_SCALE_FACTOR=1`。
- **互動驗證**：Slint 內建 MCP server（1.17+，需 `slint/mcp` feature 與 `SLINT_MCP_PORT`），
  可走 UI tree、截圖、模擬點擊；設定見 `slint` skill 的 `debugging-and-mcp.md`。
- **幀診斷**：`SLINT_DEBUG_PERFORMANCE=refresh_lazy,console` 印出重繪與幀資訊。
- **輸入到回饋**：在 host 語言（Rust `Instant`、C++ `std::chrono`、JS `performance.now()`）包住 callback，
  於下一次畫面更新後停止；Slint 端本身不適合做精細計時。
- **注意**：`for` + `ScrollView` 會一次建立所有列，長列表改 `ListView`；否則量到的是建立成本，不是渲染成本。

## 其他平台

照 `platforms/_template.md` 補一份；先確認三件事：輸入事件到畫面更新的掛鉤、幀時間來源、固定尺寸截圖方式。
