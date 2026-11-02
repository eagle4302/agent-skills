# WPF 流暢度量測要點

> 前提：`templates/test-plan.md` 已寫好門檻；這一頁只講「在 WPF 上怎麼量」。
> 所有數字都要附 build、機器、DPI、輸入方式；Debug build 的數據只能標「參考」。

## 1. 固定環境

- Release build，關閉 debugger；debugger 附著會慢 2–10 倍。
- 電源模式設高效能；筆電接電源。
- Windows 縮放固定 100%（量測時），125%／150% 另做一輪版面檢查。
- 視窗尺寸固定 1920×1080，`WindowStyle=None` 或固定大小，避免邊框與標題列影響。
- 關閉系統動畫只在「視覺截圖」時做；量手感時動畫要開，才量得到真實時序。
- 固定字型（`Microsoft JhengHei UI`）、固定資料 fixture、固定更新頻率。
- 同一輪不要換 build 或機器。

## 2. 輸入到回饋延遲

量「使用者按下到畫面出現回饋」的時間。

```csharp
using System.Diagnostics;
using System.Windows.Threading;

private readonly List<double> _latency = new();

private void OnConfirmClick(object sender, RoutedEventArgs e)
{
    long t0 = Stopwatch.GetTimestamp();

    // 更新 ViewModel、顯示確認對話框或 loading
    ViewModel.ConfirmAlarmCommand.Execute(null);

    // 排在 Render 之後的 Background 優先權，約等於「下一個畫面已呈現」
    Dispatcher.CurrentDispatcher.BeginInvoke(DispatcherPriority.Background, new Action(() =>
    {
        _latency.Add(Stopwatch.GetElapsedTime(t0).TotalMilliseconds);
    }));
}
```

- 每次互動量 ≥ 30 次；先預熱 1 次，排除前 3 次。
- 報 median 與 p95；不要只報平均。
- 按鈕要有 loading 或狀態變化，否則量到的是「沒有回饋」。

## 3. 幀時間與 UI 執行緒阻塞

### 幀間隔

```csharp
private readonly List<double> _frameDeltas = new();
private long _lastFrameTicks;

CompositionTarget.Rendering += (_, _) =>
{
    long now = Stopwatch.GetTimestamp();
    if (_lastFrameTicks != 0)
    {
        _frameDeltas.Add(Stopwatch.GetElapsedTime(_lastFrameTicks, now).TotalMilliseconds);
    }
    _lastFrameTicks = now;
};
```

- 統計 p50、p95、max；jank 定義為 > 50ms。
- 量至少 10 秒，並在期間觸發一次資料更新與一次畫面切換。

### 心跳抖動（抓 UI 執行緒卡頓）

```csharp
var sw = Stopwatch.StartNew();
double last = 0;
var timer = new DispatcherTimer(DispatcherPriority.Render)
{
    Interval = TimeSpan.FromMilliseconds(16)
};
timer.Tick += (_, __) =>
{
    double now = sw.Elapsed.TotalMilliseconds;
    if (last > 0) _jitter.Add(now - last - 16.0);
    last = now;
};
timer.Start();
```

- 閒置 30 秒、每秒更新 30 秒、警報爆發 10 秒，各量一次。
- p95 抖動 ≤ 20ms；出現 > 100ms 的尖峰要找出當下在做什麼。

## 4. 動畫時長

- 從狀態切換的第一幀開始，到屬性到達目標值為止，用 `CompositionTarget.Rendering` 的 timestamp 計算。
- 與 token 的 120／200／320ms 比對，容許 ±20%。
- 檢查 `SystemParameters.ClientAreaAnimation`（系統「減少動畫」）是否有被尊重。
- 動畫期間操作要被接受；用連點測試確認不會被吃掉或排隊太久。

## 5. 焦點順序與鍵盤

```csharp
var focused = FocusManager.GetFocusedElement(window) as UIElement;
for (int i = 0; i < 40; i++)
{
    focused?.MoveFocus(new TraversalRequest(FocusNavigationDirection.Next));
    focused = Keyboard.FocusedElement as UIElement;
    _focusOrder.Add((focused as FrameworkElement)?.Name ?? focused?.GetType().Name);
}
```

- 記錄每一站的 `Name`、`AutomationProperties.Name`、是否可見、是否有焦點外框。
- 檢查 Tab 順序符合視覺順序；Esc、Enter、空白鍵行為符合預期。
- 焦點外框不能被 `ClipToBounds` 或容器裁掉。

## 6. 觸控目標與可及性

- 走訪視覺樹，列出可互動元素並檢查尺寸：

```csharp
foreach (var fe in VisualTree.Descendants(window).OfType<FrameworkElement>()
             .Where(f => f.Focusable && f.IsVisible && f.IsHitTestVisible))
{
    if (fe.ActualWidth < 44 || fe.ActualHeight < 44)
        _smallTargets.Add($"{fe.Name} {fe.ActualWidth}x{fe.ActualHeight}");
    if (string.IsNullOrEmpty(AutomationProperties.GetName(fe)))
        _unnamed.Add(fe.Name);
}
```

- 有觸控螢幕就用真觸控測邊緣命中；滑鼠不能代表觸控。
- 檢查對比（token 值）與狀態不只靠顏色。

## 7. 資料刷新壓力

- 24 台設備、每秒更新：量心跳抖動與幀 p95。
- 警報爆發：10 秒內 50 筆新警報，確認列表不凍結、不同步阻塞。
- 綁定風暴：確認每台設備只通知自己變更的屬性，不是整個集合重設。
- 長列表要開虛擬化（`VirtualizingStackPanel.IsVirtualizing="True"`、`VirtualizationMode="Recycling"`）。
- 更新時避免整頁重建；用 `ObservableCollection` 的增量操作。

## 8. 截圖

```csharp
var rtb = new RenderTargetBitmap(1920, 1080, 96, 96, PixelFormats.Pbgra32);
rtb.Render(window);                 // 先確認已完成 Measure/Arrange
var encoder = new PngBitmapEncoder();
encoder.Frames.Add(BitmapFrame.Create(rtb));
using var fs = File.Create(path);
encoder.Save(fs);
```

- 固定 1920×1080、96 DPI、關閉動畫；每個狀態各一張。
- 或跑 app 用 `PrintWindow`／螢幕擷取，但會受視窗位置與 DPI 影響，較不穩定。
- 截圖只用於視覺比對；手感數據仍要用上面的 instrument。

## 9. 常見坑

- Debug build 或 debugger 附著：數字全部不可信。
- 遠端桌面／軟體渲染：幀時間與延遲會暴增，量到的不是實機。
- 系統關閉動畫：動畫時長量不到，且會誤判「回饋很快」。
- DPI 125% 時 `ActualWidth` 是 DIP，截圖像素是實體像素，兩者要分開記。
- `TextBlock` 與瀏覽器的字型 metrics 不同：視覺比對要容許 1–2px。
- `DropShadowEffect`、`BlurEffect`、大量 `Opacity` 會讓幀時間變差；深色主題優先用邊框。
- `DataGrid` 預設列高與內距和設計稿不同，會影響密度與命中率。
- `DispatcherPriority` 用錯：量測用的 callback 不可以排在 `Send`，會扭曲結果。
- 用 `DateTime` 計時會被系統時間調整影響；一律用 `Stopwatch`。
- GC／大型物件配置造成尖峰：量測時開 ETW 或 `dotnet-trace` 對照。
